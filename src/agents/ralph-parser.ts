import { IterationResult } from '../types.js';

/**
 * Parses AI agent output to extract task completion status,
 * quality metrics, and learnings for Ralph iteration tracking
 */
export class RalphParser {
  /**
   * Parse agent output and extract iteration result
   */
  static parseAgentOutput(
    agentOutput: string,
    iterationNum: number,
    taskId: string,
    taskTitle: string,
    tool: 'claude' | 'amp' | 'gemini'
  ): IterationResult {
    const startTime = Date.now();

    // Extract quality check results
    const qualityChecks = this.extractQualityChecks(agentOutput);

    // Determine success/partial/failed status
    const status = this.determineStatus(qualityChecks);

    // Extract learnings and errors
    const learnings = this.extractLearnings(agentOutput);
    const errors = this.extractErrors(agentOutput);

    // Extract git commit hash if present
    const gitCommit = this.extractGitCommit(agentOutput);

    // Generate summary from output
    const summary = this.generateSummary(agentOutput, status);

    // Calculate execution time (placeholder - would be from actual execution)
    const executionTime = Date.now() - startTime;

    const result: IterationResult = {
      iteration: iterationNum,
      timestamp: new Date().toISOString(),
      task_id: taskId,
      task_title: taskTitle,
      status,
      ai_tool: tool,
      execution_time_ms: executionTime,
      quality_checks: qualityChecks,
      output_summary: summary,
      git_commit: gitCommit,
      learnings,
      errors,
      metadata: {
        context_loss_count: this.countContextLoss(agentOutput),
        parsed_completion: this.isCompletionDetected(agentOutput),
      },
    };

    return result;
  }

  /**
   * Extract quality check results from agent output.
   * Uses structured count-based detection to avoid false positives.
   * "0 errors" / "no errors" are treated as success, not failure.
   * Note: In MCP ralph_run, real quality gates are determined by actual command exit codes,
   * not this parser. This is a best-effort extraction for standalone parsing.
   */
  private static extractQualityChecks(output: string): {
    type_check: boolean;
    lint: boolean;
    tests: boolean;
    coverage_met: boolean;
  } {
    const lines = output.split('\n').map((l) => l.toLowerCase().trim());

    // Type-check: pass if no TypeScript error codes (error TS\d+) found
    const tsErrorCount = (output.match(/error TS\d+/gi) ?? []).length;
    const typeCheckExplicitPass = lines.some(
      (l) =>
        (l.includes('type-check') || l.includes('tsc')) &&
        (l.includes('pass') || l.includes('success') || l.includes('✓')) &&
        !l.includes('fail')
    );
    const typeCheckPass = typeCheckExplicitPass || tsErrorCount === 0;

    // Lint: parse "X problems (Y errors, Z warnings)" — fail only if errors > 0
    // Also pass on "0 problems", "0 errors", "no problems", explicit pass
    const lintErrorCount = this.parseLintErrorCount(lines);
    const lintExplicitPass = lines.some(
      (l) =>
        (l.includes('eslint') || l.includes('lint')) &&
        (l.includes('pass') ||
          l.includes('success') ||
          l.includes('✓') ||
          l.includes('0 problems') ||
          l.includes('no problems'))
    );
    const lintExplicitFail = lines.some(
      (l) => (l.includes('eslint') || l.includes('lint')) && l.includes('fail')
    );
    const lintPass = lintExplicitFail ? false : lintExplicitPass || lintErrorCount === 0;

    // Tests: parse "X failed" — fail only if count > 0
    // "0 errors", "passing", "✓ X tests" are all success
    const testFailCount = this.parseTestFailCount(lines);
    const testExplicitPass = lines.some(
      (l) =>
        (l.includes('test') || l.includes('vitest') || l.includes('jest')) &&
        (l.includes('pass') ||
          l.includes('passed') ||
          l.includes('✓') ||
          l.includes('success') ||
          l.includes('0 errors') ||
          l.includes('no errors') ||
          l.includes('0 failed'))
    );
    const testExplicitFail = lines.some(
      (l) =>
        (l.includes('test') || l.includes('vitest') || l.includes('jest')) &&
        l.includes('fail') &&
        !l.includes('0 fail')
    );
    const testsPass = testExplicitFail ? false : testExplicitPass || testFailCount === 0;

    // Coverage: parse actual percentage or explicit pass/fail
    const covPct = this.parseCoveragePercentage(output);
    const coveragePass =
      (covPct !== null && covPct >= 95) ||
      lines.some((l) => l.includes('coverage') && this.lineHasPercentageAbove(l, 95)) ||
      lines.some(
        (l) =>
          l.includes('coverage') && (l.includes('pass') || l.includes('met') || l.includes('✓'))
      );

    return {
      type_check: typeCheckPass,
      lint: lintPass,
      tests: testsPass,
      coverage_met: coveragePass,
    };
  }

  /**
   * Parse lint error count from ESLint output.
   * Returns 0 if no error count found (treat as passing).
   */
  private static parseLintErrorCount(lines: string[]): number {
    for (const line of lines) {
      // "X problems (Y errors, Z warnings)"
      const problemsMatch = line.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?/);
      if (problemsMatch) {
        return parseInt(problemsMatch[2], 10);
      }
      // "X error" standalone
      const errorCountMatch = line.match(/^(\d+)\s+errors?$/);
      if (errorCountMatch) {
        return parseInt(errorCountMatch[1], 10);
      }
    }
    return 0;
  }

  /**
   * Parse test failure count from vitest/jest output.
   * Returns 0 if no failure count found (treat as passing).
   */
  private static parseTestFailCount(lines: string[]): number {
    for (const line of lines) {
      // "X failed" — vitest/jest
      const failMatch = line.match(/(\d+)\s+failed/);
      if (failMatch) {
        return parseInt(failMatch[1], 10);
      }
      // "Tests: X failed" — jest summary
      const jestMatch = line.match(/tests:\s+(\d+)\s+failed/);
      if (jestMatch) {
        return parseInt(jestMatch[1], 10);
      }
    }
    return 0;
  }

  /**
   * Parse real coverage percentage from test runner output.
   * Supports vitest table format and jest/c8 line format.
   * Returns null if coverage cannot be determined.
   */
  static parseCoveragePercentage(output: string): number | null {
    // vitest/istanbul table: "All files | 87.50 | ..." or "All files | 87.50 |"
    const vitestMatch = output.match(/all files\s*\|\s*(\d+(?:\.\d+)?)\s*\|/i);
    if (vitestMatch) {
      return parseFloat(vitestMatch[1]);
    }

    // jest: "Lines : 87.5%" or "Lines                : 87.5 %"
    const jestLinesMatch = output.match(/lines\s*:\s*(\d+(?:\.\d+)?)\s*%/i);
    if (jestLinesMatch) {
      return parseFloat(jestLinesMatch[1]);
    }

    // c8/nyc: "% Lines  | 87.5"
    const c8Match = output.match(/%\s*lines\s*\|\s*(\d+(?:\.\d+)?)/i);
    if (c8Match) {
      return parseFloat(c8Match[1]);
    }

    // Generic: "coverage: 87%" or "coverage 87.5%"
    const genericMatch = output.match(/coverage[:\s]+(\d+(?:\.\d+)?)%/i);
    if (genericMatch) {
      return parseFloat(genericMatch[1]);
    }

    return null;
  }

  /**
   * Helper: Check if a single line contains percentage >= threshold
   */
  private static lineHasPercentageAbove(line: string, threshold: number): boolean {
    // eslint-disable-next-line no-useless-escape
    const percentMatches = line.match(/(\d+(?:\.\d+)?)%/g);
    if (!percentMatches) {
      return false;
    }
    return percentMatches.some((match) => {
      const percent = parseFloat(match);
      return percent >= threshold;
    });
  }

  /**
   * Determine overall iteration status
   */
  private static determineStatus(qualityChecks: {
    type_check: boolean;
    lint: boolean;
    tests: boolean;
    coverage_met: boolean;
  }): 'success' | 'partial' | 'failed' {
    const allPass =
      qualityChecks.type_check &&
      qualityChecks.lint &&
      qualityChecks.tests &&
      qualityChecks.coverage_met;

    if (allPass) {
      return 'success';
    }

    const passCount = Object.values(qualityChecks).filter(Boolean).length;
    if (passCount >= 2) {
      return 'partial';
    }

    return 'failed';
  }

  /**
   * Extract learnings and insights from output
   */
  private static extractLearnings(output: string): string[] {
    const learnings: string[] = [];

    // Look for key learnings markers
    const learningsMatch = output.match(/(?:learning|insight|pattern|note)[\s:]*([^\n]+)/gi);
    if (learningsMatch) {
      learningsMatch.forEach((match) => {
        const cleaned = match.replace(/^(?:learning|insight|pattern|note)[\s:]*/i, '').trim();
        if (cleaned.length > 10 && cleaned.length < 500) {
          learnings.push(cleaned);
        }
      });
    }

    // Extract from code comments about discoveries
    const discoveryMatch = output.match(/(?:discovered|found|realized)[\s:]*([^\n]+)/gi);
    if (discoveryMatch) {
      discoveryMatch.forEach((match) => {
        const cleaned = match.replace(/^(?:discovered|found|realized)[\s:]*/i, '').trim();
        if (cleaned.length > 10 && cleaned.length < 500) {
          learnings.push(cleaned);
        }
      });
    }

    return learnings.slice(0, 5); // Limit to 5 learnings
  }

  /**
   * Extract errors from output
   */
  private static extractErrors(output: string): string[] {
    const errors: string[] = [];

    // Look for error patterns
    const errorMatch = output.match(/(?:error|failed|fail)[\s:]*([^\n]+)/gi);
    if (errorMatch) {
      errorMatch.forEach((match) => {
        const cleaned = match.replace(/^(?:error|failed|fail)[\s:]*/i, '').trim();
        if (cleaned.length > 5 && cleaned.length < 300) {
          errors.push(cleaned);
        }
      });
    }

    // Look for stack traces or error codes
    const stackMatch = output.match(/(?:Error|Exception)[\s:]*([^\n]+)/g);
    if (stackMatch) {
      stackMatch.forEach((match) => {
        const cleaned = match.trim();
        if (cleaned.length > 5 && !errors.includes(cleaned)) {
          errors.push(cleaned);
        }
      });
    }

    return errors.slice(0, 3); // Limit to 3 errors
  }

  /**
   * Extract git commit hash from output
   */
  private static extractGitCommit(output: string): string | undefined {
    // Look for commit hashes (40 hex chars or short 7-char format)
    const commitMatch = output.match(/\b[a-f0-9]{7,40}\b/);
    if (commitMatch) {
      const hash = commitMatch[0];
      // Verify it looks like a commit hash (after 'commit' keyword)
      if (output.toLowerCase().includes('commit') && output.includes(hash)) {
        return hash;
      }
    }
    return undefined;
  }

  /**
   * Generate summary from agent output
   */
  private static generateSummary(output: string, status: string): string {
    // Get first 300 chars of meaningful content
    const lines = output
      .split('\n')
      .filter((l) => l.trim().length > 20)
      .slice(0, 3);

    let summary = lines.join(' ').substring(0, 300);

    // Add status if not already present
    if (!summary.toLowerCase().includes(status)) {
      summary = `[${status.toUpperCase()}] ${summary}`;
    }

    return summary;
  }

  /**
   * Count context loss events in output
   */
  private static countContextLoss(output: string): number {
    const contextLossPatterns = [
      /context.*loss/gi,
      /context.*window/gi,
      /ran out of.*context/gi,
      /context.*exceeded/gi,
    ];

    let count = 0;
    for (const pattern of contextLossPatterns) {
      const matches = output.match(pattern) || [];
      count += matches.length;
    }

    return Math.min(count, 10); // Cap at 10
  }

  /**
   * Check if iteration completion is detected
   */
  private static isCompletionDetected(output: string): boolean {
    const completionKeywords = [
      'complete',
      'done',
      'finished',
      'success',
      'implemented',
      'deployed',
      'committed',
    ];

    const lowerOutput = output.toLowerCase();
    return completionKeywords.some((kw) => lowerOutput.includes(kw));
  }

  /**
   * Parse `npm audit --json` output.
   * Returns the highest severity found: 'critical' | 'high' | 'moderate' | 'low' | 'none'
   */
  static parseNpmAuditSeverity(
    jsonOutput: string
  ): 'critical' | 'high' | 'moderate' | 'low' | 'none' {
    try {
      const parsed = JSON.parse(jsonOutput) as {
        metadata?: {
          vulnerabilities?: { critical?: number; high?: number; moderate?: number; low?: number };
        };
      };
      const v = parsed?.metadata?.vulnerabilities;
      if (!v) return 'none';
      if ((v.critical ?? 0) > 0) return 'critical';
      if ((v.high ?? 0) > 0) return 'high';
      if ((v.moderate ?? 0) > 0) return 'moderate';
      if ((v.low ?? 0) > 0) return 'low';
      return 'none';
    } catch {
      // Not valid JSON — try text-based fallback
      return this.parseSecurityOutputText(jsonOutput);
    }
  }

  /**
   * Parse text-based security tool output (trivy, semgrep, or npm audit without --json).
   * Returns the highest severity found: 'critical' | 'high' | 'moderate' | 'low' | 'none'
   */
  static parseSecurityOutputText(
    output: string
  ): 'critical' | 'high' | 'moderate' | 'low' | 'none' {
    const lower = output.toLowerCase();
    if (lower.includes('critical')) return 'critical';
    if (lower.includes(' high')) return 'high';
    if (lower.includes('moderate')) return 'moderate';
    if (lower.includes(' low')) return 'low';
    return 'none';
  }

  /**
   * Parse trivy JSON output (`trivy fs --format json`) for the highest severity found.
   */
  static parseTrivySeverity(jsonOutput: string): 'critical' | 'high' | 'moderate' | 'low' | 'none' {
    try {
      const parsed = JSON.parse(jsonOutput) as {
        Results?: Array<{ Vulnerabilities?: Array<{ Severity?: string }> }>;
      };
      const severities = (parsed.Results ?? [])
        .flatMap((r) => r.Vulnerabilities ?? [])
        .map((v) => (v.Severity ?? '').toLowerCase());

      if (severities.includes('critical')) return 'critical';
      if (severities.includes('high')) return 'high';
      if (severities.includes('medium')) return 'moderate'; // trivy uses MEDIUM
      if (severities.includes('moderate')) return 'moderate';
      if (severities.includes('low')) return 'low';
      return 'none';
    } catch {
      return this.parseSecurityOutputText(jsonOutput);
    }
  }

  /**
   * Parse semgrep JSON output (`semgrep --json`) for the highest severity found.
   */
  static parseSemgrepSeverity(
    jsonOutput: string
  ): 'critical' | 'high' | 'moderate' | 'low' | 'none' {
    try {
      const parsed = JSON.parse(jsonOutput) as {
        results?: Array<{ extra?: { severity?: string; metadata?: { severity?: string } } }>;
      };
      const severities = (parsed.results ?? []).map((r) => {
        const sev = (r.extra?.severity ?? r.extra?.metadata?.severity ?? '').toLowerCase();
        return sev;
      });

      if (severities.includes('critical') || severities.includes('error')) return 'high'; // semgrep ERROR ≈ high
      if (severities.includes('high')) return 'high';
      if (
        severities.includes('warning') ||
        severities.includes('medium') ||
        severities.includes('moderate')
      )
        return 'moderate';
      if (severities.includes('info') || severities.includes('low')) return 'low';
      return severities.length > 0 ? 'low' : 'none';
    } catch {
      return this.parseSecurityOutputText(jsonOutput);
    }
  }

  /**
   * Determine if a security gate passes given the found severity and the configured failOn threshold.
   * Severity order: none < low < moderate < high < critical
   */
  static securityGatePasses(
    foundSeverity: 'critical' | 'high' | 'moderate' | 'low' | 'none',
    failOn: 'critical' | 'high' | 'moderate' | 'low'
  ): boolean {
    const order = ['none', 'low', 'moderate', 'high', 'critical'];
    const foundIdx = order.indexOf(foundSeverity);
    const failIdx = order.indexOf(failOn);
    return foundIdx < failIdx;
  }
}
