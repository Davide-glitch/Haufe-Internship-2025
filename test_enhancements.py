#!/usr/bin/env python3
"""
Test script to verify all three enhancements:
1. Language detection
2. Code-focused prompts with line numbers
3. Change tracking display
"""

import requests
import json
import time

BASE_URL = "http://localhost:7070"

def test_language_detection():
    """Test that language detection works for various file types"""
    print("\n=== TEST 1: Language Detection ===")
    
    payload = {
        "repo": "Davide-glitch/Santorini-Game",
        "model": "qwen2.5-coder:7b",
        "temperature": 0.1,
        "changedOnly": False,
        "maxBytesPerBatch": 50000
    }
    
    print(f"Requesting repo review: {payload['repo']}")
    response = requests.post(f"{BASE_URL}/api/reviewRepo", json=payload, timeout=300)
    
    if response.status_code == 200:
        result = response.json().get('review', '')
        
        if "(Language:" in result:
            print("[PASS] Language detection WORKING - Found language annotations")
            lines = result.split('\n')
            lang_lines = [l for l in lines if '(Language:' in l][:5]
            for line in lang_lines:
                print(f"   {line}")
        else:
            print("[FAIL] Language detection FAILED - No language annotations found")
    else:
        print(f"[FAIL] API Error: {response.status_code}")
        print(response.text)

def test_code_focused_prompts():
    """Test that prompts enforce code-level analysis with line numbers"""
    print("\n=== TEST 2: Code-Focused Prompts ===")
    
    buggy_code = """
def unsafe_eval(user_input):
    # Security issue: using eval
    return eval(user_input)

def sql_query(username):
    # SQL injection vulnerability
    query = f"SELECT * FROM users WHERE name = '{username}'"
    return query

def missing_error_handling():
    # No error handling
    file = open('data.txt')
    content = file.read()
    return content
"""
    
    payload = {
        "code": buggy_code,
        "language": "python",
        "model": "qwen2.5-coder:7b",
        "temperature": 0.1
    }
    
    print("Reviewing code with known vulnerabilities...")
    response = requests.post(f"{BASE_URL}/api/review", json=payload, timeout=60)
    
    if response.status_code == 200:
        result = response.json().get('raw', '')
        
        checks = {
            "Line numbers": any(word in result for word in ["Line", "line", "Line(s)", "line:"]),
            "Severity levels": any(word in result for word in ["CRITICAL", "HIGH", "MEDIUM", "Severity"]),
            "Current Code block": "```" in result,
            "Fixed/Corrected Code": any(word in result.lower() for word in ["fixed", "corrected", "should be"]),
        }
        
        print("\nCode-focused elements check:")
        for check, passed in checks.items():
            status = "[PASS]" if passed else "[FAIL]"
            print(f"{status} {check}: {'PRESENT' if passed else 'MISSING'}")
        
        if all(checks.values()):
            print("\n[PASS] Code-focused prompts WORKING")
        else:
            print("\n[WARN] Code-focused prompts PARTIALLY WORKING")
            
        print("\nFirst 500 chars of review:")
        print(result[:500])
    else:
        print(f"[FAIL] API Error: {response.status_code}")
        print(response.text)

def test_change_tracking():
    """Test that change tracking displays what changed"""
    print("\n=== TEST 3: Change Tracking Display ===")
    
    payload = {
        "repo": "Davide-glitch/Santorini-Game",
        "model": "qwen2.5-coder:7b",
        "temperature": 0.1,
        "changedOnly": False,
        "maxBytesPerBatch": 50000
    }
    
    print("Step 1: Full review to establish cache...")
    response = requests.post(f"{BASE_URL}/api/reviewRepo", json=payload, timeout=300)
    
    if response.status_code == 200:
        print("[PASS] Cache established")
        
        print("\nStep 2: Incremental review with changedOnly=true...")
        payload['changedOnly'] = True
        
        time.sleep(2)
        
        response = requests.post(f"{BASE_URL}/api/reviewRepo", json=payload, timeout=300)
        
        if response.status_code == 200:
            result = response.json().get('review', '')
            
            if "## Files Changed" in result or "Files Changed" in result:
                print("[PASS] Change tracking WORKING - Found 'Files Changed' section")
                
                lines = result.split('\n')
                in_changes = False
                change_lines = []
                for line in lines:
                    if 'Files Changed' in line:
                        in_changes = True
                    elif in_changes and line.strip().startswith('##') and 'Files Changed' not in line:
                        break
                    elif in_changes:
                        change_lines.append(line)
                
                print("\nChange summary:")
                for line in change_lines[:20]:
                    print(line)
            else:
                print("[WARN] Change tracking: No changes detected (or section missing)")
                print("       This is expected if repo has not changed since last review")
        else:
            print(f"[FAIL] API Error: {response.status_code}")
    else:
        print(f"[FAIL] API Error: {response.status_code}")

def main():
    print("=" * 60)
    print("TESTING ENHANCED CODE REVIEW FEATURES")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            health = response.json()
            print(f"\n[PASS] Backend is healthy")
            print(f"       Model: {health.get('model', 'unknown')}")
            print(f"       Available models: {len(health.get('models', []))}")
        else:
            print(f"\n[FAIL] Backend health check failed: {response.status_code}")
            return
    except Exception as e:
        print(f"\n[FAIL] Cannot connect to backend: {e}")
        print("       Make sure backend is running on http://localhost:7070")
        return
    
    try:
        test_code_focused_prompts()
        time.sleep(2)
        
        test_language_detection()
        time.sleep(2)
        
        test_change_tracking()
        
    except KeyboardInterrupt:
        print("\n\n[WARN] Tests interrupted by user")
    except Exception as e:
        print(f"\n\n[FAIL] Test error: {e}")
    
    print("\n" + "=" * 60)
    print("TESTS COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
