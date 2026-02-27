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
   * Uses line-level matching to avoid false positives from global keyword presence.
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

    // Look for explicit pass/fail patterns on the SAME line as the gate keyword
    const typeCheckPass = lines.some(
      (l) =>
        (l.includes('type-check') || l.includes('tsc')) &&
        (l.includes('pass') || l.includes('success') || l.includes('✓')) &&
        !l.includes('fail') &&
        !l.includes('error')
    );

    const lintPass = lines.some(
      (l) =>
        (l.includes('eslint') || (l.includes('lint') && !l.includes('linting issues'))) &&
        (l.includes('pass') ||
          l.includes('success') ||
          l.includes('✓') ||
          l.includes('0 problems')) &&
        !l.includes('fail') &&
        !l.includes('error')
    );

    const testsPass = lines.some(
      (l) =>
        (l.includes('test') || l.includes('vitest') || l.includes('jest')) &&
        (l.includes('pass') || l.includes('passed') || l.includes('✓') || l.includes('success')) &&
        !l.includes('fail') &&
        !l.includes('error')
    );

    const coveragePass =
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
}
