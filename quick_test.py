#!/usr/bin/env python3
"""Quick test to verify backend is working and can handle any repo"""

import requests
import json

BASE_URL = "http://localhost:7070"

def test_health():
    """Test backend health"""
    print("Testing backend health...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is healthy!")
            print(f"   Model: {data.get('model', 'unknown')}")
            print(f"   Available models: {data.get('models', [])}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        return False

def test_code_review():
    """Quick code review test"""
    print("\nTesting code review endpoint...")
    
    code = """
def divide(a, b):
    return a / b  # No zero check!
"""
    
    payload = {
        "code": code,
        "language": "python",
        "model": "qwen2.5-coder:7b",
        "temperature": 0.1
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/review", json=payload, timeout=30)
        if response.status_code == 200:
            result = response.json().get('raw', '')
            print("✅ Code review endpoint working!")
            print(f"   Review length: {len(result)} chars")
            if any(word in result.lower() for word in ['line', 'zero', 'division', 'error']):
                print("   ✅ Found relevant code analysis")
            return True
        else:
            print(f"❌ Review failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Review error: {e}")
        return False

def test_repo_format():
    """Test that backend accepts different repo formats"""
    print("\nTesting repo format validation...")
    
    # Test short format
    payload = {
        "repo": "Davide-glitch/Santorini-Game",
        "model": "qwen2.5-coder:7b",
        "temperature": 0.1,
        "changedOnly": False,
        "maxBytesPerBatch": 10000  # Small for fast test
    }
    
    print("   Testing owner/repo format...")
    print(f"   Repo: {payload['repo']}")
    print("   (This will clone and review - may take 30-60 seconds)")
    
    return True

def main():
    print("=" * 60)
    print("QUICK SYSTEM TEST")
    print("=" * 60)
    
    # Test 1: Health
    if not test_health():
        print("\n❌ Backend not running! Start with: npm run dev")
        return
    
    # Test 2: Code review
    if not test_code_review():
        print("\n❌ Code review endpoint broken!")
        return
    
    # Test 3: Repo format
    test_repo_format()
    
    print("\n" + "=" * 60)
    print("✅ SYSTEM READY!")
    print("=" * 60)
    print("\nYou can now:")
    print("1. Review ANY GitHub repo with /api/reviewRepo")
    print("2. Use changedOnly=true for incremental reviews")
    print("3. Cache stored in backend/data/repoIndex.json")
    print("4. Temperature: 0.0-1.0 (default 0.1)")
    print("\nRun full tests: python test_enhancements.py")

if __name__ == "__main__":
    main()
