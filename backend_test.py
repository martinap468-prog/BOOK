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
        self.test_book_id = None

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
            
            # Test for all 11 expected exercise types
            expected_types = ["sequence", "math", "match", "odd_one_out", "copy", "recognition", 
                            "memory", "maze", "differences", "coloring", "connect_dots"]
            
            # Test for image-based exercises
            image_exercises = []
            text_exercises = []
            
            for ex_type, data in response.items():
                has_image = data.get('has_image', False)
                if has_image:
                    image_exercises.append(ex_type)
                else:
                    text_exercises.append(ex_type)
                    
                if ex_type in expected_types:
                    print(f"   ✓ {ex_type}: {data['name']} {'🎨' if has_image else '📝'}")
                    
            # Validate we have exactly 11 types
            if len(response) != 11:
                print(f"   ❌ Expected 11 exercise types, got {len(response)}")
                self.errors.append(f"Expected 11 exercise types, got {len(response)}")
                
            # Validate image exercises
            expected_image_types = ["maze", "differences", "coloring", "connect_dots"]
            if set(image_exercises) != set(expected_image_types):
                print(f"   ❌ Image exercises mismatch. Expected: {expected_image_types}, Got: {image_exercises}")
                self.errors.append(f"Image exercises mismatch")
            else:
                print(f"   ✅ Correct 4 image exercises: {image_exercises}")
                
            # Validate text exercises
            expected_text_types = ["sequence", "math", "match", "odd_one_out", "copy", "recognition", "memory"]
            if set(text_exercises) != set(expected_text_types):
                print(f"   ❌ Text exercises mismatch. Expected: {expected_text_types}, Got: {text_exercises}")
                self.errors.append(f"Text exercises mismatch")
            else:
                print(f"   ✅ Correct 7 text exercises: {text_exercises}")
                
            # Check for missing types
            missing_types = [t for t in expected_types if t not in response]
            if missing_types:
                print(f"   ❌ Missing exercise types: {missing_types}")
                self.errors.append(f"Missing exercise types: {missing_types}")
                
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

    def test_image_exercise_maze(self):
        """Test maze exercise generation with image"""
        print("   ⚠️  Image generation may take 30-60 seconds...")
        exercise_data = {
            "exercise_type": "maze",
            "difficulty": "medium",
            "quantity": 1,
            "color_mode": "bw"
        }
        success, response = self.run_test("Generate Maze Exercise", "POST", "/generate/exercise", 200, exercise_data)
        if success and 'exercises' in response:
            exercise = response['exercises'][0]
            print(f"   Exercise type: {exercise.get('type')}")
            has_image = exercise.get('image_base64') is not None
            print(f"   Has image_base64: {has_image}")
            if has_image:
                img_len = len(exercise.get('image_base64', ''))
                print(f"   Image size: {img_len} characters")
                print("   ✅ Image exercise correctly has image_base64")
            else:
                print("   ⚠️  Image missing - may have failed generation")
                self.errors.append("Maze exercise missing image_base64")
        return success, response

    def test_image_exercise_coloring(self):
        """Test coloring exercise generation with image"""
        print("   ⚠️  Image generation may take 30-60 seconds...")
        exercise_data = {
            "exercise_type": "coloring",
            "difficulty": "easy",
            "quantity": 1,
            "color_mode": "bw"
        }
        success, response = self.run_test("Generate Coloring Exercise", "POST", "/generate/exercise", 200, exercise_data)
        if success and 'exercises' in response:
            exercise = response['exercises'][0]
            print(f"   Exercise type: {exercise.get('type')}")
            has_image = exercise.get('image_base64') is not None
            print(f"   Has image_base64: {has_image}")
            if has_image:
                img_len = len(exercise.get('image_base64', ''))
                print(f"   Image size: {img_len} characters")
                print("   ✅ Image exercise correctly has image_base64")
            else:
                print("   ⚠️  Image missing - may have failed generation")
                self.errors.append("Coloring exercise missing image_base64")
        return success, response

    def test_text_exercise_no_image(self):
        """Test that text exercises don't have images"""
        exercise_data = {
            "exercise_type": "sequence",
            "difficulty": "medium",
            "quantity": 1,
            "color_mode": "bw"
        }
        success, response = self.run_test("Generate Text Exercise (No Image)", "POST", "/generate/exercise", 200, exercise_data)
        if success and 'exercises' in response:
            exercise = response['exercises'][0]
            has_image = exercise.get('image_base64') is not None
            print(f"   Text exercise has image: {has_image}")
            if has_image:
                print("   ❌ Text exercise should not have image_base64")
                self.errors.append("Text exercise incorrectly has image_base64")
                return False
            else:
                print("   ✅ Text exercise correctly has no image")
        return success, response

def main():
    """Main test runner"""
    print("🧠 Cognitive Exercise API Testing - Image Features")
    print("=" * 60)
    
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
        tester.test_book_id = book_id
    
    tester.test_get_books()

    # Test text exercise generation 
    print("\n📝 Testing Text Exercise Generation")
    tester.test_generate_exercise()
    tester.test_text_exercise_no_image()

    # Test image exercise generation  
    print("\n🎨 Testing Image Exercise Generation")
    tester.test_image_exercise_maze()
    tester.test_image_exercise_coloring()

    # Test all exercise types
    print("\n🎯 Testing All Exercise Types")
    tester.test_multiple_exercise_types()
    
    # Test chapter generation
    print("\n📖 Testing Chapter Generation")
    tester.test_generate_chapter()

    # Print final results
    print(f"\n📊 Final Test Results")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.errors:
        print(f"\n❌ Errors found ({len(tester.errors)}):")
        for error in tester.errors:
            print(f"   - {error}")
    else:
        print("\n✅ All tests passed successfully!")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())