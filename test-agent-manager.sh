#!/bin/bash

# Agent Manager Test Command
# This script provides comprehensive testing for the agent manager functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run a test command
run_test() {
    local test_name=$1
    local command=$2
    local description=$3
    
    print_status $BLUE "Running: $description"
    
    if eval "$command" > /dev/null 2>&1; then
        print_status $GREEN "✅ $test_name passed"
        return 0
    else
        print_status $RED "❌ $test_name failed"
        return 1
    fi
}

# Function to check if we're in the right directory
check_directory() {
    if [ ! -f "package.json" ] || [ ! -f "src/core/agent-manager.ts" ]; then
        print_status $RED "❌ Please run this script from the rulebook project root"
        exit 1
    fi
}

# Function to check Node.js and npm
check_dependencies() {
    print_status $BLUE "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_status $RED "❌ Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_status $RED "❌ npm is not installed"
        exit 1
    fi
    
    print_status $GREEN "✅ Dependencies OK"
}

# Function to install dependencies
install_dependencies() {
    print_status $BLUE "Installing dependencies..."
    
    if [ ! -d "node_modules" ]; then
        npm install
    else
        print_status $YELLOW "Dependencies already installed"
    fi
}

# Function to run basic tests
run_basic_tests() {
    print_status $BLUE "\n🧪 Running Basic Tests"
    
    local passed=0
    local failed=0
    
    # Test 1: Type Check
    if run_test "Type Check" "npm run type-check" "TypeScript type checking"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 2: Lint Check
    if run_test "Lint Check" "npm run lint" "ESLint checks"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 3: Format Check
    if run_test "Format Check" "npm run format" "Prettier formatting"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 4: Build
    if run_test "Build" "npm run build" "TypeScript compilation"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 5: Run Tests
    if run_test "Unit Tests" "npm test" "Running all tests"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    # Test 6: Coverage
    if run_test "Coverage" "npm run test:coverage" "Test coverage analysis"; then
        ((passed++))
    else
        ((failed++))
    fi
    
    print_status $BLUE "\n📊 Basic Tests Summary:"
    print_status $GREEN "✅ Passed: $passed"
    print_status $RED "❌ Failed: $failed"
    
    if [ $failed -gt 0 ]; then
        return 1
    fi
}

# Function to test CLI tools
test_cli_tools() {
    print_status $BLUE "\n🔧 Testing CLI Tools Detection"
    
    local tools=("cursor-agent" "cursor-cli" "gemini-cli" "claude-cli")
    local available_tools=()
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            local version=$(eval "$tool --version" 2>/dev/null || echo "unknown")
            print_status $GREEN "✅ $tool available - $version"
            available_tools+=("$tool")
        else
            print_status $YELLOW "ℹ️ $tool not available"
        fi
    done
    
    if [ ${#available_tools[@]} -eq 0 ]; then
        print_status $YELLOW "⚠️ No CLI tools detected. Agent Manager will not be able to execute tasks."
    else
        print_status $GREEN "✅ Found ${#available_tools[@]} CLI tool(s) available"
    fi
}

# Function to test agent manager functionality
test_agent_manager() {
    print_status $BLUE "\n🤖 Testing Agent Manager Functionality"
    
    # Test if agent manager can be imported
    if run_test "Agent Manager Import" "node -e \"import('./dist/core/agent-manager.js').then(() => console.log('Import successful')).catch(() => process.exit(1))\"" "Testing agent manager import"; then
        print_status $GREEN "✅ Agent Manager can be imported"
    else
        print_status $RED "❌ Agent Manager import failed"
        return 1
    fi
    
    # Test if CLI bridge can be imported
    if run_test "CLI Bridge Import" "node -e \"import('./dist/core/cli-bridge.js').then(() => console.log('Import successful')).catch(() => process.exit(1))\"" "Testing CLI bridge import"; then
        print_status $GREEN "✅ CLI Bridge can be imported"
    else
        print_status $RED "❌ CLI Bridge import failed"
        return 1
    fi
}

# Function to run comprehensive tests
run_comprehensive_tests() {
    print_status $BLUE "\n🚀 Running Comprehensive Tests"
    
    # Run the comprehensive test suite
    if npm test tests/agent-manager-comprehensive.test.ts > /dev/null 2>&1; then
        print_status $GREEN "✅ Comprehensive tests passed"
    else
        print_status $RED "❌ Comprehensive tests failed"
        return 1
    fi
}

# Function to show help
show_help() {
    print_status $BLUE "🤖 Agent Manager Test Command"
    echo ""
    print_status $YELLOW "Usage: $0 [options]"
    echo ""
    print_status $YELLOW "Options:"
    echo "  --basic          Run basic tests only"
    echo "  --cli-tools      Test CLI tools detection only"
    echo "  --agent          Test agent manager functionality only"
    echo "  --comprehensive  Run comprehensive test suite"
    echo "  --all            Run all tests (default)"
    echo "  --help, -h       Show this help message"
    echo ""
    print_status $YELLOW "Examples:"
    echo "  $0 --basic"
    echo "  $0 --cli-tools"
    echo "  $0 --all"
}

# Main function
main() {
    local test_type="all"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --basic)
                test_type="basic"
                shift
                ;;
            --cli-tools)
                test_type="cli-tools"
                shift
                ;;
            --agent)
                test_type="agent"
                shift
                ;;
            --comprehensive)
                test_type="comprehensive"
                shift
                ;;
            --all)
                test_type="all"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                print_status $RED "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    print_status $BLUE "🤖 Agent Manager Test Command"
    print_status $BLUE "=============================="
    
    # Check if we're in the right directory
    check_directory
    
    # Check dependencies
    check_dependencies
    
    # Install dependencies if needed
    install_dependencies
    
    # Run tests based on type
    case $test_type in
        "basic")
            run_basic_tests
            ;;
        "cli-tools")
            test_cli_tools
            ;;
        "agent")
            test_agent_manager
            ;;
        "comprehensive")
            run_comprehensive_tests
            ;;
        "all")
            run_basic_tests
            test_cli_tools
            test_agent_manager
            run_comprehensive_tests
            ;;
    esac
    
    print_status $GREEN "\n🎉 All requested tests completed!"
}

# Run main function with all arguments
main "$@"