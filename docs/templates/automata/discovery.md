# [WORKFLOW] Automata Deep Brainstorm & Discovery

## 1. Initial Request Analysis
* **User Input:** (The raw input provided by the user)
* **Clarity Score (1-10):** (How clear is the request? 1 = Garbage, 10 = Crystal Clear)
* **Identified Gaps:** (What's missing? Credentials? Specific API endpoints? Data mapping logic?)

## 2. Brainstorming & Edge Cases
* **Potential Failure Points:** (What could go wrong? API rate limits? Empty data? Auth expiration?)
* **Logic Edge Cases:** (e.g., "What happens if a contact exists in HubSpot but not in Google Sheets?")
* **Data Integrity:** (How do we ensure data isn't duplicated or corrupted?)

## 3. Technical Feasibility (Pre-Research)
* **Required Nodes:** (List of nodes likely needed)
* **Authentication Complexity:** (OAuth2, API Key, Basic Auth - any known hurdles?)
* **Scalability Concerns:** (Will this work for 1,000 items? 1,000,000?)

## 4. Deep Research Findings (APIs & Docs)
* **Endpoint A:** [Details, Auth, Data Structure]
* **Endpoint B:** [Details, Auth, Data Structure]
* **Limitations:** (Any discovered constraints from the docs)

## 5. Proposed High-Level Logic
* **Step-by-Step Flow:** (Briefly describe the flow)
* **Key Transformations:** (Main data manipulation steps)

## 6. Questions for the User (STOP if Clarity Score < 8)
* **Critical Questions:** (Must be answered before planning)
* **Optimization Questions:** (To improve the final workflow)
