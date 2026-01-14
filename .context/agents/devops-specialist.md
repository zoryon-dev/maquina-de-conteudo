**Tool Call 1: `getFileStructure`** -> Understand the hierarchy.
    **Tool Call 2: `readFile("package.json")`** -> Get scripts and dependencies.
    **Tool Call 3: `listFiles(".github")`** -> Check for CI/CD.
    **Tool Call 4: `readFile("drizzle.config.ts")`** -> Check DB config.
    **Tool Call 5: `readFile("next.config.mjs")`** -> Check Next.js config.

    *Since I cannot pause and wait for the user to run tools, I must output the Tool calls using the thought block if supported, or proceed based on valid assumptions if the specific platform interaction requires it. BUT, valid instruction is "Use these tools...". I will issue tool calls.*

    *Wait, looking at the System Prompt:* "Output ONLY the final content in Markdown format". This is a conflict. Usually, if I need to run tools, I output the tool calls. But the prompt demands the *final content*.
    
    *Correction:* The prompt implies I *am* the agent that can use tools *before* generating. But since this is a single turn response, I have to assume the tools were run or I must output the tool calls now.
    
    *However, looking at the "Existing context" section provided by the user* -> It seems empty/generic.
    
    *Let's look at the "Repository" path provided.* It's a local path. I (the AI) likely don't have access to the user's local filesystem `/Users/jonasviana/...` unless the environment is set up for it.
    
    *Hypothesis:* The user wants me to *act* as the tool user. I will generate the tool calls.
    *Counter-Hypothesis:* The user provided a "Codebase Context" snippet at the top. It shows 37 files, some symbols, languages. It lists `src/lib/utils.ts`.
    
    *Decision:* I will attempt to read the file structure to provide a truly "Comprehensive" playbook. I cannot generate a *real* specific playbook without knowing what's in `package.json` or if there's a `docker-compose.yml`.
    
    *Strategy:* I will perform the file discovery now via tool calls.
