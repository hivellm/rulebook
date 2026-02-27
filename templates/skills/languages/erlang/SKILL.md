---
name: "Erlang"
description: "Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow)."
version: "1.0.0"
category: "languages"
author: "Rulebook"
tags: ["languages", "language"]
dependencies: []
conflicts: []
---
<!-- ERLANG:START -->
# Erlang Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
rebar3 format --verify    # Format check
rebar3 dialyzer           # Type analysis
rebar3 eunit              # Unit tests
rebar3 ct                 # Common Test
rebar3 cover              # Coverage check
rebar3 compile            # Build verification

# Security audit:
rebar3 tree               # Dependency tree
```

## Erlang Configuration

**CRITICAL**: Use Erlang/OTP 26+ with rebar3 and proper testing.

- **Version**: Erlang/OTP 26+
- **Recommended**: Erlang/OTP 27+
- **Build Tool**: rebar3
- **Testing**: EUnit, Common Test, PropEr
- **Linter**: Elvis
- **Dialyzer**: Type analysis
- **Documentation**: EDoc

### rebar.config Requirements

```erlang
{erl_opts, [
    debug_info,
    warnings_as_errors,
    warn_export_all,
    warn_unused_import,
    warn_untyped_record
]}.

{deps, [
    {jsx, "3.1.0"}
]}.

{plugins, [
    rebar3_hex,
    rebar3_ex_doc,
    rebar3_proper,
    rebar3_lint
]}.

{profiles, [
    {test, [
        {erl_opts, [debug_info, export_all, nowarn_export_all]},
        {deps, [
            {meck, "0.9.2"},
            {proper, "1.4.0"}
        ]}
    ]},
    {prod, [
        {erl_opts, [no_debug_info, warnings_as_errors]},
        {relx, [
            {dev_mode, false},
            {include_erts, true},
            {include_src, false}
        ]}
    ]}
]}.

{cover_enabled, true}.
{cover_opts, [verbose]}.

{dialyzer, [
    {warnings, [
        error_handling,
        underspecs,
        unmatched_returns
    ]},
    {get_warnings, true},
    {plt_apps, top_level_deps},
    {plt_extra_apps, []},
    {plt_location, local},
    {base_plt_apps, [erts, kernel, stdlib]},
    {base_plt_location, global}
]}.

{xref_checks, [
    undefined_function_calls,
    undefined_functions,
    locals_not_used,
    deprecated_function_calls,
    deprecated_functions
]}.
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow)
rebar3 as test fmt --check

# 2. Lint (matches workflow)
rebar3 as test lint

# 3. Compile (matches workflow)
rebar3 compile

# 4. Dialyzer (type analysis - matches workflow)
rebar3 dialyzer

# 5. Run EUnit tests (MUST pass 100% - matches workflow)
rebar3 eunit

# 6. Run Common Test (matches workflow)
rebar3 ct

# 7. Run PropEr properties (matches workflow)
rebar3 proper

# 8. Coverage (MUST meet threshold - matches workflow)
rebar3 cover

# 9. Cross-reference check (matches workflow)
rebar3 xref

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes OTP release failures
- Dialyzer errors caught in CI but not locally = type safety issues
- Example: Skipping Dialyzer locally = CI catches type discrepancies
- Example: Missing xref check = undefined function calls in production
- Example: Not running PropEr = property violations in production

### Testing

- **EUnit**: Unit testing framework
- **Common Test**: Integration and system tests
- **PropEr**: Property-based testing
- **Location**: `test/` directory

Example EUnit test:
```erlang
-module(data_processor_tests).
-include_lib("eunit/include/eunit.hrl").

process_valid_input_test() ->
    Input = [1, 2, 3, 4, 5],
    Result = data_processor:process(Input, 0.5),
    ?assert(length(Result) > 0).

process_empty_input_test() ->
    Result = data_processor:process([], 0.5),
    ?assertEqual([], Result).

process_invalid_threshold_test() ->
    ?assertError(badarg, data_processor:process([1, 2, 3], -1)).

process_with_options_test() ->
    Options = #{threshold => 0.5, verbose => true},
    Result = data_processor:process([1, 2, 3], Options),
    ?assert(is_list(Result)).
```

Example Common Test:
```erlang
-module(integration_SUITE).
-include_lib("common_test/include/ct.hrl").

-export([all/0, init_per_suite/1, end_per_suite/1]).
-export([test_basic_workflow/1, test_error_handling/1]).

all() ->
    [test_basic_workflow, test_error_handling].

init_per_suite(Config) ->
    application:ensure_all_started(your_app),
    Config.

end_per_suite(_Config) ->
    application:stop(your_app),
    ok.

test_basic_workflow(_Config) ->
    {ok, Pid} = data_processor:start_link(),
    ok = data_processor:process(Pid, [1, 2, 3]),
    {ok, Result} = data_processor:get_result(Pid),
    true = length(Result) > 0,
    ok = data_processor:stop(Pid).

test_error_handling(_Config) ->
    {ok, Pid} = data_processor:start_link(),
    {error, badarg} = data_processor:process(Pid, invalid_input),
    ok = data_processor:stop(Pid).
```

Example PropEr property:
```erlang
-module(prop_data_processor).
-include_lib("proper/include/proper.hrl").
-include_lib("eunit/include/eunit.hrl").

prop_process_preserves_length() ->
    ?FORALL(List, list(integer()),
        begin
            Result = data_processor:process(List, 0.5),
            length(Result) =< length(List)
        end).

prop_process_filters_correctly() ->
    ?FORALL({List, Threshold}, {list(number()), number()},
        begin
            Result = data_processor:process(List, Threshold),
            lists:all(fun(X) -> X > Threshold end, Result)
        end).

% Run properties
process_properties_test() ->
    ?assert(proper:quickcheck(prop_process_preserves_length(), 100)),
    ?assert(proper:quickcheck(prop_process_filters_correctly(), 100)).
```

## OTP Patterns

**CRITICAL**: Follow OTP principles for robust systems.

```erlang
-module(data_server).
-behaviour(gen_server).

%% API
-export([start_link/0, process/2, stop/1]).

%% gen_server callbacks
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).

-record(state, {
    threshold :: float(),
    cache :: map()
}).

%%% API

start_link() ->
    gen_server:start_link(?MODULE, [], []).

process(Pid, Data) ->
    gen_server:call(Pid, {process, Data}).

stop(Pid) ->
    gen_server:stop(Pid).

%%% gen_server callbacks

init([]) ->
    {ok, #state{threshold = 0.5, cache = #{}}}.

handle_call({process, Data}, _From, State) ->
    Result = filter_data(Data, State#state.threshold),
    NewCache = maps:put(Data, Result, State#state.cache),
    {reply, {ok, Result}, State#state{cache = NewCache}};
handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.

%%% Internal functions

filter_data(Data, Threshold) ->
    [X || X <- Data, X > Threshold].
```

## Best Practices

### DO's ✅

- **USE** OTP behaviors (gen_server, gen_statem, supervisor)
- **HANDLE** all error cases with pattern matching
- **USE** typespecs for all exported functions
- **TEST** with PropEr for property-based testing
- **USE** supervisor trees for fault tolerance
- **VALIDATE** inputs in public APIs
- **DOCUMENT** with EDoc

### DON'Ts ❌

- **NEVER** ignore Dialyzer warnings
- **NEVER** use catch-all patterns without logging
- **NEVER** create processes without supervision
- **NEVER** skip xref checks
- **NEVER** use deprecated functions
- **NEVER** ignore test failures
- **NEVER** deploy without Dialyzer clean

Example with typespecs:
```erlang
-module(calculator).
-export([add/2, divide/2]).

-spec add(number(), number()) -> number().
add(A, B) -> A + B.

-spec divide(number(), number()) -> {ok, float()} | {error, divide_by_zero}.
divide(_A, 0) -> {error, divide_by_zero};
divide(A, B) -> {ok, A / B}.
```

## CI/CD Requirements

Must include GitHub Actions workflows:

1. **Testing** (`erlang-test.yml`):
   - OTP versions: 26, 27
   - Run EUnit, CT, PropEr
   - Coverage reporting

2. **Linting** (`erlang-lint.yml`):
   - Elvis linting
   - Dialyzer type checking
   - xref verification

3. **Build** (`erlang-build.yml`):
   - Create OTP release
   - Verify all applications start

## Publishing to Hex.pm

```bash
# 1. Update version in src/your_app.app.src
# 2. Run all quality checks
rebar3 dialyzer
rebar3 eunit
rebar3 ct

# 3. Publish
rebar3 hex publish
```

<!-- ERLANG:END -->

