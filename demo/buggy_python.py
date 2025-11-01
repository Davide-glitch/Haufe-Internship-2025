"""
Demo file with intentional code issues for testing the AI Code Review extension.
This file demonstrates the extension's ability to detect various problems.
"""

import os
import sqlite3

# ISSUE: Hardcoded password (CRITICAL)
password = "admin123"
api_key = "sk-1234567890abcdef"

# ISSUE: SQL injection vulnerability (CRITICAL)
def get_user(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # Vulnerable to SQL injection!
    query = "SELECT * FROM users WHERE username = '%s'" % username
    cursor.execute(query)
    return cursor.fetchone()

# ISSUE: Using eval (CRITICAL)
def calculate(expression):
    # Never use eval with user input!
    result = eval(expression)
    return result

# ISSUE: Bare except clause (WARNING)
def risky_operation():
    try:
        # Some operation
        data = fetch_data()
    except:  # Catches everything, including KeyboardInterrupt!
        print("Error occurred")

# ISSUE: Debug print statements (WARNING)
def process_data(data):
    print(f"Debug: processing {data}")  # Remove before commit
    result = data * 2
    print(f"Debug: result = {result}")
    return result

# ISSUE: Missing docstring (INFO)
def calculate_total(items):
    return sum(items)

# TODO: Implement caching
def expensive_operation():
    pass

# Good code example
def secure_user_auth(username: str, password_hash: str) -> bool:
    """
    Securely authenticates a user using hashed passwords.
    
    Args:
        username: The username to authenticate
        password_hash: The hashed password
        
    Returns:
        True if authentication successful, False otherwise
    """
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    # Parameterized query - safe from SQL injection
    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", 
                   (username, password_hash))
    return cursor.fetchone() is not None

if __name__ == "__main__":
    # Minimal DB bootstrap so the demo doesn't crash when run directly
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    cur.execute("CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, password TEXT)")
    # Insert a sample user if table is empty
    cur.execute("SELECT COUNT(*) FROM users")
    count = cur.fetchone()[0]
    if count == 0:
        cur.execute("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)", ("admin", "admin"))
        conn.commit()
    conn.close()

    # ISSUE: Using hardcoded credentials
    result = get_user("admin")
    print(result)
