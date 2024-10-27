import axiod from "https://deno.land/x/axiod/mod.ts";
import { minify } from 'npm:minify';
import { serve } from "https://deno.land/std@0.178.0/http/server.ts";
import { contentType } from "https://deno.land/std@0.178.0/media_types/mod.ts";

// ATProto API endpoints
const BASE_URL = "https://bsky.social/xrpc";
const LOGIN_URL = `${BASE_URL}/com.atproto.server.createSession`;
const CREATE_RECORD_URL = `${BASE_URL}/com.atproto.repo.createRecord`;
const RESOLVE_HANDLE_URL = `${BASE_URL}/com.atproto.identity.resolveHandle`;
const LIST_RECORDS_URL = `${BASE_URL}/com.atproto.repo.listRecords`;

// Custom lexicon for JavaScript file storage
const customLexicon = {
  lexicon: 1,
  id: "pro.atdev.protoscript",
  defs: {
    main: {
      type: "record",
      description: "A JavaScript file stored on ATProto",
      key: "tid",
      record: {
        type: "object",
        required: ["filename", "content"],
        properties: {
          filename: {
            type: "string",
            description: "Name of the JavaScript file"
          },
          content: {
            type: "string",
            description: "Content of the JavaScript file"
          },
          description: {
            type: "string",
            description: "Optional description of the file"
          }
        }
      }
    }
  }
};

interface Session {
  accessJwt: string;
  did: string;
}

async function login(username: string, password: string): Promise<Session> {
  try {
    const response = await axiod.post(LOGIN_URL, { identifier: username, password });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Login failed: ${error.message}`);
    }
    throw new Error("Login failed: Unknown error");
  }
}

async function publishJavaScriptFile(session: Session, filename: string, content: string, description?: string) {
  const headers = {
    Authorization: `Bearer ${session.accessJwt}`,
    'Content-Type': 'application/json'
  };

  // Minify the JavaScript content
  let minifiedContent;
  try {
    minifiedContent = await minify.js(content);
  } catch (error) {
    console.warn("Failed to minify JavaScript. Using original content.", error);
    minifiedContent = content;
  }

  const record = {
    filename,
    content: minifiedContent,
    description
  };

  const data = {
    repo: session.did,
    collection: customLexicon.id,
    record
  };

  try {
    const response = await axiod.post(CREATE_RECORD_URL, data, { headers });
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to publish record: ${error.message}`);
    }
    throw new Error("Failed to publish record: Unknown error");
  }
}

async function resolveHandle(handle: string): Promise<string> {
  try {
    const response = await axiod.get(RESOLVE_HANDLE_URL, {
      params: { handle }
    });
    return response.data.did;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to resolve handle: ${error.message}`);
    }
    throw new Error("Failed to resolve handle: Unknown error");
  }
}

async function getRecordsForUser(username: string) {
  try {
    const did = await resolveHandle(username);
    const response = await axiod.get(LIST_RECORDS_URL, {
      params: {
        repo: did,
        collection: customLexicon.id,
        limit: 100 // You can adjust this limit as needed
      }
    });
    return response.data.records;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get records: ${error.message}`);
    }
    throw new Error("Failed to get records: Unknown error");
  }
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Serve static files
  if (url.pathname === "/styles.css" || url.pathname === "/script.js" || url.pathname === "/rick.mp3") {
    try {
      const file = await Deno.readFile(`.${url.pathname}`);
      const fileExtension = url.pathname.split('.').pop();
      const mimeType = contentType(fileExtension || '');
      return new Response(file, {
        headers: { "Content-Type": mimeType || 'application/octet-stream' },
      });
    } catch (error) {
      console.error(`Error serving static file: ${error}`);
      return new Response("Not Found", { status: 404 });
    }
  }

  if (url.pathname === "/" && request.method === "GET") {
    const html = await Deno.readTextFile("index.html");
    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (url.pathname === "/publish" && request.method === "POST") {
    const { username, password, filename, content, description } = await request.json();

    if (!username || !password) {
      return new Response("Username and password are required", { status: 400 });
    }

    try {
      const session = await login(username, password);
      const result = await publishJavaScriptFile(session, filename, content, description);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof Error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
      return new Response("An unknown error occurred", { status: 500 });
    }
  }

  if (url.pathname === "/getRecords" && request.method === "GET") {
    const username = url.searchParams.get("username");
    if (!username) {
      return new Response("Username is required", { status: 400 });
    }

    try {
      const records = await getRecordsForUser(username);
      return new Response(JSON.stringify(records), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      if (error instanceof Error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
      return new Response("An unknown error occurred", { status: 500 });
    }
  }

  return new Response("Not Found", { status: 404 });
}

const PORT = 8080;
const HOSTNAME = "0.0.0.0";

console.log(`Server running on http://${HOSTNAME}:${PORT}`);
await serve(handleRequest, { port: PORT, hostname: HOSTNAME });
