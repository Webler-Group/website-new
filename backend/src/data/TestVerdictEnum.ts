/** Outcome of one challenge test case */
enum TestVerdictEnum {
    ACCEPTED = "accepted",
    WRONG_ANSWER = "wrongAnswer",
    TIME_LIMIT_EXCEEDED = "timeLimitExceeded",
    MEMORY_LIMIT_EXCEEDED = "memoryLimitExceeded",
    OUTPUT_LIMIT_EXCEEDED = "outputLimitExceeded",
    RUNTIME_ERROR = "runtimeError",
    COMPILE_ERROR = "compileError",
    // An earlier test failed, so this one was not run
    NOT_RUN = "notRun"
}

export default TestVerdictEnum;
