Of course. This is a crucial clarification. The following Product Requirements Document has been updated to reflect that while the individual UI components are already built, the work of assembling them and implementing all the client-side logic is **in scope**.

This version precisely defines the "glue" work required to bring the pre-built components to life.

# Product Requirements Document: AI-Powered Shopify Chatbot

## 1. Introduction

This document outlines the product requirements for the development of an AI-Powered Shopify Chatbot. This project focuses on assembling pre-built UI components and implementing the application's business logic, theme integration, and database architecture.

**Key Assumption:** The individual React UI components for the chatbot (e.g., ``, ``, ``, ``) have already been built and are available in a component library.

The scope of work detailed here includes:
1.  **Chatbot Frontend Logic:** Assembling the pre-built UI components and writing the Next.js application logic to handle state management, user interactions, and API communication.
2.  **Shopify Theme Integration:** Developing client-side JavaScript to embed the chatbot and create a communication bridge with the main Shopify store.
3.  **Database Architecture:** Setting up and managing the Supabase database.

## 2. System Architecture & Data Flow

*   **Chatbot Frontend (In Scope: Logic & Assembly):** The Next.js/React application logic your team will build, utilizing a library of pre-built UI components.
*   **Shopify Theme Scripts (In Scope):** The JavaScript files your team will create to integrate the frontend into the Shopify theme.
*   **AI Backend - n8n Webhook (Out of Scope):** The n8n workflow is a black box. Your team is responsible for **sending it requests and handling its responses.**
*   **Database - Supabase (In Scope):** The PostgreSQL database your team will configure and manage.

**Data Flow:**
1.  A user visits the Shopify store.
2.  **(In Scope)** Your Shopify theme scripts inject the chatbot ``.
3.  **(In Scope)** The Next.js application logic initializes. It connects to Supabase to fetch the user's conversation history.
4.  **(In Scope)** The application logic passes the fetched history as props to the pre-built UI components to render the conversation.
5.  **(In Scope)** The application logic captures user input from the UI components (e.g., `onSubmit` from an input form, `onClick` from a microphone button).
6.  **(In Scope)** The logic saves the user's message to Supabase, then constructs and sends a request to the n8n webhook.
7.  **(Out of Scope)** The stateless n8n webhook processes the request and returns an AI response.
8.  **(In Scope)** The application logic receives the response, saves the AI's message to Supabase, and updates the application's state, causing the UI to re-render with the new message.
9.  **(In Scope)** If the response contains interactive elements, the logic handles the action (e.g., `onClick` on an "Add to Cart" button), triggering a `postMessage` call.
10. **(In Scope)** Your Shopify theme scripts receive this command and execute the action.

## 3. In-Scope Features & Functionality

### 3.1. Chatbot Frontend Logic & Integration (Next.js)

Your team is **not** responsible for designing or building the visual React components. You will be provided with a library of pre-built components. Your responsibility is to implement the application logic that powers these components.

#### 3.1.1. UI Assembly & State Management
*   **Objective:** To assemble the provided UI components and manage the application state.
*   **Tasks:**
    *   Use the pre-built components (`ChatWindow`, `InputBar`, etc.) to construct the application's layout.
    *   Implement state management (e.g., using React Hooks like `useState`, `useEffect`) to handle the conversation history, loading status, and user input.
    *   Pass state down as props to the UI components to ensure the UI correctly reflects the current state of the conversation (e.g., displaying messages, showing a loading indicator).

#### 3.1.2. Collecting Inputs & Handling Actions
*   **Objective:** To wire up the event-handling logic to the UI components.
*   **Tasks:**
    *   Attach event handlers (`onSubmit`, `onClick`) to the provided input components.
    *   **Collect Text Input:** Capture the text from the input field upon submission.
    *   **Collect Voice Input:** When the microphone button is clicked, trigger the browser's audio capture, process the result into a Base64 string, and manage the recording state (e.g., showing a visual indicator).
    *   **Handle Card Actions:** Implement the `onClick` handler for the "Add to Cart" button on the `ProductCard` component. This handler must trigger the `postMessage` communication.

#### 3.1.3. API & Data Communication
*   **Objective:** To handle all data exchange with external services.
*   **Tasks:**
    *   **Sending to n8n Webhook:** Create the service/function to send a `POST` request to the n8n webhook, containing the JSON payload specified in the API Contract (section 4.1).
    *   **Receiving from n8n Webhook:** Handle the asynchronous response, parse the JSON, and update the application state.
    *   **Database Communication:**
        *   Implement functions to call the Supabase API to **fetch** conversation history on load and **save** new user and AI messages as they occur.

### 3.2. Shopify Theme Integration & Scripts

Your team will develop modular JavaScript files (each under **350 lines**) for the Shopify theme.

*   **Chatbot Initialization:** Script(s) to inject the iframe and pass initial context.
*   **Parent Page Action Bridge:** Script(s) to listen for `postMessage` events and handle the `addToCart` action by calling the Shopify AJAX API.

### 3.3. Database Configuration (Supabase)

Your team will configure the database schema and implement security policies.

*   **Schema Setup:** Use the provided SQL script.
*   **RLS Hardening:** Implement and test Row Level Security policies to ensure a user can only access their own conversation data. This is a critical security requirement.

**(The base SQL schema script from previous versions remains the same.)**

## 4. Integration Points & API Specifications

### 4.1. Webhook API Contract

Your Next.js application logic will be responsible for all communication with this endpoint.

*   **Endpoint:** `POST /chat-webhook`
*   **Request Body & Response Body:** (Unchanged from the previous version)

## 5. Out of Scope

*   **UI Component Development:** The design and creation of the React UI components.
*   **n8n Webhook Workflow:** The internal logic of the n8n workflow.
*   **Analytics Dashboards, Proactive Messaging, A/B Testing Frameworks.**

## 6. Acceptance Criteria

1.  The Next.js application logic is implemented, correctly assembling and managing the provided UI components to create a functional chat experience.
2.  User inputs (text and voice) are correctly captured from the UI components.
3.  The application state is managed effectively, ensuring the UI accurately displays the conversation history and loading indicators.
4.  Conversation history is fetched from Supabase on load, and new messages are saved in real-time.
5.  The n8n webhook is called with the correct payload, and the response is correctly rendered in the UI.
6.  The `addToCart` action on product cards works end-to-end.
7.  All custom-written code files adhere to the 350-line limit.
8.  Supabase RLS policies are implemented and verified to ensure strict data isolation.