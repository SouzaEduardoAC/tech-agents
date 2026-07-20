- type:: [[Plan]]
- status:: [[ACTIVE]]
- project:: [[tech-agents]]
- relates-to:: [[Add MCP Sampling to the agent-hub MCP, allowing fallback for clients without sampling support, and release as beta first.-prd]]

- # Executive Summary
	- This document details the technical and architectural plan to add MCP Sampling to the `agent-hub` MCP server. The solution resolves Codex's prompt drift issue by delegating the execution loop to the server while using the client's SSO LLM session.

- # Architectural Decisions
	- ## [[ADR-01]]: Dynamic Handshake Capability Checking
		- **Context:** The server needs to know if the host client supports the sampling API.
		- **Decision:** Utilize `server.getClientCapabilities()` post-initialization. Specifically, check if `server.getClientCapabilities()?.sampling` is defined.
		- **Consequences:** Safe runtime detection. If sampling is unsupported, the server raises clean errors or falls back to prompt injection.
		- **Links:**
			- Satisfies: [[FR-01]], [[FR-04]]
	- ## [[ADR-02]]: Introduction of `run_agent_loop` Tool
		- **Context:** We need a clean interface to request server-side loop execution without altering the behavior of the existing `call_agent_command` prompt-injection API.
		- **Decision:** Expose a new tool `run_agent_loop` in `index.js`.
			- Input Parameters:
				- `agent` (string)
				- `command` (string)
				- `args` (string)
		- **Consequences:** Backwards compatibility is preserved. Prompt injection is still available via `call_agent_command` while `run_agent_loop` provides the enterprise SSO path.
		- **Links:**
			- Satisfies: [[FR-02]]
	- ## [[ADR-03]]: Prompt Pinning & Iteration Control
		- **Context:** Codex's host instructions dilute and override the agent system prompt over time.
		- **Decision:** The server executes the conversation loop. On every turn, it calls `server.createMessage()` with:
			- `systemPrompt`: Pinned with the full agent persona, standards, and stack files.
			- `messages`: Pinned and managed message history array.
		- **Consequences:** The client LLM is used as a stateless model oracle; it cannot dilute the system prompt.
		- **Links:**
			- Satisfies: [[FR-03]]
	- ## [[ADR-04]]: Local Tool Action Parser
		- **Context:** The agent needs filesystem and terminal access, but calling server tools via the client's sampling API is poorly supported across various IDEs.
		- **Decision:** The server instructs the model to wrap file operations and terminal executions in structured XML tags:
			- `<read_file path="relative/path" />`
			- `<write_file path="relative/path">[content]</write_file>`
			- `<run_command cmd="command arguments" />`
			- `<task_complete summary="Agent task successfully achieved" />`
		- The server parses these XML blocks from the model's text response, runs the Node filesystem or process executor, and appends the command/file output as a user message in the next iteration.
		- **Consequences:** High portability across all MCP clients. Resolves tool availability issues. Requires strict regex path checks to prevent directory traversal outside the workspace.
		- **Links:**
			- Satisfies: [[FR-06]]
	- ## [[ADR-05]]: Beta Version Release
		- **Context:** Safeguard stable production environments from untested loop changes.
		- **Decision:** Target a pre-release version suffix (`X.Y.Z-beta.N`) and publish on npm under the `beta` tag.
		- **Consequences:** Easy opt-in for enterprise testing without impacting production defaults.
		- **Links:**
			- Satisfies: [[FR-05]]

- # Dependency & API Contracts (Context7)
	- The following method signatures from `@modelcontextprotocol/sdk` are verified via Context7:
	- ```typescript
	  // Sampling API on the Server class
	  createMessage(
	    params: CreateMessageRequestParamsBase | CreateMessageRequestParamsWithTools, 
	    options?: RequestOptions
	  ): Promise<CreateMessageResult | CreateMessageResultWithTools>;
	  
	  // Accessing client capabilities
	  getClientCapabilities(): ClientCapabilities | undefined;
	  ```

- # Sequence Diagrams
	- ```mermaid
	  sequenceDiagram
	    autonumber
	    Client->>Server: tools/call (run_agent_loop)
	    Note over Server: Check getClientCapabilities().sampling
	    alt No Sampling Support
	      Server-->>Client: Error / Fallback advice
	    else Has Sampling Support
	      Note over Server: Compile agent persona + standards
	      loop Up to max iterations
	        Server->>Client: sampling/createMessage (systemPrompt, messages)
	        Client-->>Server: Assistant Response (Text with XML tag)
	        Note over Server: Parse XML (e.g. <read_file>)
	        Note over Server: Run Node fs.readFile
	        Note over Server: Push result to messages as 'user' role
	      end
	      Server-->>Client: Final summary
	    end
	  ```

- # Metadata
	- created-at:: 2026-07-10
	- tags:: #architecture #adr #sampling
