/**
 * Demo TypeScript file with intentional issues
 */

// ISSUE: Using any type (WARNING)
function processData(data: any): any {
  console.log("Processing:", data);
  return data;
}

// ISSUE: Console statements (WARNING)
class UserService {
  private apiKey = "hardcoded-key-123";  // CRITICAL

  async getUser(id: string): Promise<any> {  // WARNING: any type
    console.log(`Fetching user ${id}`);
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
}

// ISSUE: eval (CRITICAL)
const calculator = {
  evaluate: (expr: string) => eval(expr)
};

// Good TypeScript code
interface User {
  id: string;
  name: string;
  email: string;
}

class SecureUserService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getUser(id: string): Promise<User> {
    const response = await fetch(`/api/users/${id}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user: ${response.statusText}`);
    }
    
    return response.json() as Promise<User>;
  }
}
