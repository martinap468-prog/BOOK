#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime

class CognitiveExerciseAPITester:
    def __init__(self, base_url="https://booklet-forge.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    json_response = response.json()
                    print(f"   Response type: {type(json_response)}")
                    if isinstance(json_response, dict):
                        print(f"   Keys: {list(json_response.keys())}")
                    return success, json_response
                except:
                    return success, {"text": response.text}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                print(f"❌ Failed - {error_msg}")
                print(f"   Response: {response.text[:200]}...")
                self.errors.append(f"{name}: {error_msg}")
                return False, {}

        except Exception as e:
            error_msg = f"Exception: {str(e)}"
            print(f"❌ Failed - {error_msg}")
            self.errors.append(f"{name}: {error_msg}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_exercise_types(self):
        """Test exercise types endpoint"""
        success, response = self.run_test("Exercise Types", "GET", "/exercise-types", 200)
        if success:
            print(f"   Available exercise types: {len(response)} types")
            required_types = ["sequence", "math", "match", "odd_one_out", "copy", "recognition", "memory"]
            for req_type in required_types:
                if req_type in response:
                    print(f"   ✓ {req_type}: {response[req_type]['name']}")
                else:
                    print(f"   ✗ Missing: {req_type}")
                    self.errors.append(f"Missing exercise type: {req_type}")
        return success, response

    def test_create_book(self):
        """Test creating a book"""
        book_data = {
            "title": "Test Quaderno Cognitivo",
            "subtitle": "Test Subtitle",
            "author": "Test Author",
            "settings": {
                "difficulty": "medium",
                "color_mode": "bw",
                "font_size": 18,
                "exercises_per_page": 1
            }
        }
        return self.run_test("Create Book", "POST", "/books", 200, book_data)

    def test_get_books(self):
        """Test getting all books"""
        return self.run_test("Get Books", "GET", "/books", 200)

    def test_generate_exercise(self):
        """Test exercise generation"""
        exercise_data = {
            "exercise_type": "sequence",
            "difficulty": "medium",
            "quantity": 1,
            "color_mode": "bw"
        }
        success, response = self.run_test("Generate Exercise", "POST", "/generate/exercise", 200, exercise_data)
        if success and 'exercises' in response:
            exercise = response['exercises'][0]
            print(f"   Generated exercise: {exercise.get('title', 'No title')}")
            print(f"   Type: {exercise.get('type', 'No type')}")
            print(f"   Content keys: {list(exercise.get('content', {}).keys())}")
        return success, response

    def test_generate_chapter(self):
        """Test chapter generation"""
        chapter_data = {
            "chapter_title": "Test Sequenze",
            "exercise_type": "sequence", 
            "difficulty": "medium",
            "exercise_count": 3,
            "color_mode": "bw"
        }
        success, response = self.run_test("Generate Chapter", "POST", "/generate/chapter", 200, chapter_data)
        if success and 'exercises' in response:
            print(f"   Generated chapter with {len(response['exercises'])} exercises")
        return success, response

    def test_multiple_exercise_types(self):
        """Test generating different exercise types"""
        exercise_types = ["math", "match", "odd_one_out", "copy", "recognition", "memory"]
        passed = 0
        
        for ex_type in exercise_types:
            exercise_data = {
                "exercise_type": ex_type,
                "difficulty": "medium", 
                "quantity": 1,
                "color_mode": "bw"
            }
            success, response = self.run_test(f"Generate {ex_type.title()} Exercise", "POST", "/generate/exercise", 200, exercise_data)
            if success:
                passed += 1
        
        return passed == len(exercise_types), {"passed": passed, "total": len(exercise_types)}

def main():
    """Main test runner"""
    print("🧠 Cognitive Exercise API Testing")
    print("=" * 50)
    
    tester = CognitiveExerciseAPITester()
    book_id = None

    # Test basic API endpoints
    print("\n📡 Testing Basic Endpoints")
    tester.test_root_endpoint()
    tester.test_exercise_types()

    # Test book operations
    print("\n📚 Testing Book Operations")
    success, book_data = tester.test_create_book()
    if success and 'id' in book_data:
        book_id = book_data['id']
        print(f"   Created book ID: {book_id}")
    
    tester.test_get_books()

    # Test exercise generation 
    print("\n⚡ Testing Exercise Generation")
    tester.test_generate_exercise()
    tester.test_generate_chapter()

    # Test all exercise types
    print("\n🎯 Testing All Exercise Types")
    tester.test_multiple_exercise_types()

    # Print final results
    print(f"\n📊 Final Results")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.errors:
        print(f"\n❌ Errors found ({len(tester.errors)}):")
        for error in tester.errors:
            print(f"   - {error}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())