import requests
import sys
import json
from datetime import datetime
import time

class NBCFDCAPITester:
    def __init__(self, base_url="https://credit-insight-2.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_beneficiary_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response text: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth_register(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_data = {
            "username": f"testuser_{timestamp}",
            "email": f"test_{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.test_user_id = response['user']['id']
            print(f"✅ User registered with ID: {self.test_user_id}")
            return True
        return False

    def test_auth_login(self):
        """Test user login with existing credentials"""
        # Try to login with the registered user
        if not self.test_user_id:
            print("❌ No test user available for login test")
            return False
            
        # For this test, we'll use the token from registration
        # In a real scenario, we'd test login separately
        return True

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        success, response = self.run_test(
            "Get Stats",
            "GET",
            "stats",
            200
        )
        
        if success:
            required_fields = ['total_beneficiaries', 'total_applications', 'approved_loans', 'approval_rate']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in stats: {field}")
                    return False
            print(f"✅ Stats: {response['total_beneficiaries']} beneficiaries, {response['total_applications']} applications")
        return success

    def test_generate_mock_data(self):
        """Test mock data generation"""
        success, response = self.run_test(
            "Generate Mock Data",
            "POST",
            "mock-data/generate",
            200,
            params={"count": 5}
        )
        
        if success and 'ids' in response:
            print(f"✅ Generated {len(response['ids'])} mock beneficiaries")
            return True
        return success

    def test_get_beneficiaries(self):
        """Test getting beneficiaries list"""
        success, response = self.run_test(
            "Get Beneficiaries",
            "GET",
            "beneficiaries",
            200
        )
        
        if success and isinstance(response, list):
            if len(response) > 0:
                self.test_beneficiary_id = response[0]['id']
                print(f"✅ Found {len(response)} beneficiaries")
                # Check required fields in first beneficiary
                required_fields = ['id', 'name', 'business_type', 'loan_amount']
                for field in required_fields:
                    if field not in response[0]:
                        print(f"❌ Missing field in beneficiary: {field}")
                        return False
            return True
        return success

    def test_get_beneficiary_detail(self):
        """Test getting individual beneficiary"""
        if not self.test_beneficiary_id:
            print("❌ No test beneficiary ID available")
            return False
            
        success, response = self.run_test(
            "Get Beneficiary Detail",
            "GET",
            f"beneficiaries/{self.test_beneficiary_id}",
            200
        )
        
        if success:
            required_fields = ['id', 'name', 'business_type', 'loan_amount', 'repayment_history']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in beneficiary detail: {field}")
                    return False
            print(f"✅ Beneficiary details loaded for: {response['name']}")
        return success

    def test_update_consumption_data(self):
        """Test updating consumption data"""
        if not self.test_beneficiary_id:
            print("❌ No test beneficiary ID available")
            return False
            
        consumption_data = {
            "electricity_kwh": 250.5,
            "mobile_recharge_monthly": 400.0,
            "utility_bill_avg": 1800.0
        }
        
        success, response = self.run_test(
            "Update Consumption Data",
            "PUT",
            f"beneficiaries/{self.test_beneficiary_id}/consumption",
            200,
            data=consumption_data
        )
        
        if success:
            print("✅ Consumption data updated successfully")
        return success

    def test_calculate_credit_score(self):
        """Test credit score calculation with AI"""
        if not self.test_beneficiary_id:
            print("❌ No test beneficiary ID available")
            return False
            
        print("⏳ Calculating credit score (this may take a few seconds for AI processing)...")
        success, response = self.run_test(
            "Calculate Credit Score",
            "POST",
            f"beneficiaries/{self.test_beneficiary_id}/score",
            200
        )
        
        if success:
            required_fields = ['credit_score', 'risk_band', 'income_category', 'explanation', 'recommendations']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in score result: {field}")
                    return False
            
            print(f"✅ Credit Score: {response['credit_score']:.1f}/100")
            print(f"✅ Risk Band: {response['risk_band']}")
            print(f"✅ AI Explanation: {response['explanation'][:100]}...")
            print(f"✅ Recommendations: {len(response['recommendations'])} provided")
        return success

    def test_loan_application(self):
        """Test loan application with auto-approval"""
        if not self.test_beneficiary_id:
            print("❌ No test beneficiary ID available")
            return False
            
        loan_data = {
            "beneficiary_id": self.test_beneficiary_id,
            "loan_amount": 50000.0,
            "loan_purpose": "Business expansion"
        }
        
        success, response = self.run_test(
            "Apply for Loan",
            "POST",
            "loans/apply",
            200,
            data=loan_data
        )
        
        if success:
            required_fields = ['id', 'beneficiary_id', 'loan_amount', 'status']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing field in loan application: {field}")
                    return False
            
            print(f"✅ Loan Application Status: {response['status']}")
            print(f"✅ Application ID: {response['id']}")
        return success

    def test_get_loan_applications(self):
        """Test getting loan applications"""
        success, response = self.run_test(
            "Get Loan Applications",
            "GET",
            "loans",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} loan applications")
            if len(response) > 0:
                # Check required fields in first application
                required_fields = ['id', 'beneficiary_id', 'loan_amount', 'status']
                for field in required_fields:
                    if field not in response[0]:
                        print(f"❌ Missing field in loan application: {field}")
                        return False
        return success

    def test_invalid_endpoints(self):
        """Test error handling for invalid requests"""
        # Test invalid beneficiary ID
        success, _ = self.run_test(
            "Invalid Beneficiary ID",
            "GET",
            "beneficiaries/invalid-id",
            404
        )
        
        if success:
            print("✅ Proper 404 handling for invalid beneficiary ID")
        
        return success

def main():
    print("🚀 Starting NBCFDC Credit Scoring Platform API Tests")
    print("=" * 60)
    
    tester = NBCFDCAPITester()
    
    # Test sequence
    test_sequence = [
        ("Authentication", tester.test_auth_register),
        ("Stats Endpoint", tester.test_stats_endpoint),
        ("Mock Data Generation", tester.test_generate_mock_data),
        ("Get Beneficiaries", tester.test_get_beneficiaries),
        ("Get Beneficiary Detail", tester.test_get_beneficiary_detail),
        ("Update Consumption Data", tester.test_update_consumption_data),
        ("Calculate Credit Score", tester.test_calculate_credit_score),
        ("Loan Application", tester.test_loan_application),
        ("Get Loan Applications", tester.test_get_loan_applications),
        ("Error Handling", tester.test_invalid_endpoints),
    ]
    
    print(f"\n📋 Running {len(test_sequence)} test categories...")
    
    for category, test_func in test_sequence:
        print(f"\n{'='*20} {category} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test category failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed! Backend API is working correctly.")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed. Check the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())