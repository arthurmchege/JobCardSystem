#!/bin/bash
# ============================================================================
# JOB CARD SYSTEM - COMPREHENSIVE TEST SUITE
# ============================================================================
# This script tests all major functionality end-to-end
# Run this before your presentation to verify everything works!

set -e  # Exit on error

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   JOB CARD MANAGEMENT SYSTEM - COMPREHENSIVE TEST SUITE       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Base URL
API_URL="http://localhost:5000/api/v1"

# ============================================================================
# Helper Functions
# ============================================================================

test_passed() {
    echo -e "${GREEN}✓ PASSED:${NC} $1"
    ((TESTS_PASSED++))
}

test_failed() {
    echo -e "${RED}✗ FAILED:${NC} $1"
    echo -e "${RED}   Reason: $2${NC}"
    ((TESTS_FAILED++))
    FAILED_TESTS+=("$1")
}

test_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ============================================================================
# TEST 1: SERVER HEALTH CHECK
# ============================================================================

test_section "TEST 1: Server Health Check"

echo "Testing if server is running..."
HEALTH_RESPONSE=$(curl -s $API_URL/health)

if echo "$HEALTH_RESPONSE" | grep -q "success.*true"; then
    test_passed "Server is running and healthy"
else
    test_failed "Server health check" "Server not responding correctly"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi

# ============================================================================
# TEST 2: DATABASE CONNECTION
# ============================================================================

test_section "TEST 2: Database Connection"

echo "Testing database connection..."
DB_RESPONSE=$(curl -s $API_URL/db-test)

if echo "$DB_RESPONSE" | grep -q "success.*true"; then
    test_passed "Database connection successful"
else
    test_failed "Database connection" "Database not accessible"
    echo "Response: $DB_RESPONSE"
fi

# ============================================================================
# TEST 3: AUTHENTICATION FLOW
# ============================================================================

test_section "TEST 3: Authentication Flow"

# Test 3.1: Login with supervisor credentials
echo "3.1: Testing supervisor login..."
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "supervisor@test.com",
    "password": "password123"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    SUPERVISOR_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    test_passed "Supervisor login successful"
else
    test_failed "Supervisor login" "Login failed or no token returned"
    echo "Response: $LOGIN_RESPONSE"
fi

# Test 3.2: Login with technician credentials
echo "3.2: Testing technician login..."
TECH_LOGIN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "technician@test.com",
    "password": "password123"
  }')

if echo "$TECH_LOGIN" | grep -q "token"; then
    TECH_TOKEN=$(echo $TECH_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    test_passed "Technician login successful"
else
    test_failed "Technician login" "Login failed"
fi

# Test 3.3: Get current user (verify token works)
echo "3.3: Testing get current user..."
ME_RESPONSE=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" $API_URL/auth/me)

if echo "$ME_RESPONSE" | grep -q "supervisor@test.com"; then
    test_passed "Token authentication working"
else
    test_failed "Token authentication" "Failed to get current user"
fi

# Test 3.4: Invalid credentials
echo "3.4: Testing login with invalid credentials..."
INVALID_LOGIN=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@test.com",
    "password": "wrongpassword"
  }')

if echo "$INVALID_LOGIN" | grep -q "success.*false"; then
    test_passed "Invalid login properly rejected"
else
    test_failed "Invalid login rejection" "Should reject invalid credentials"
fi

# ============================================================================
# TEST 4: UUID MIGRATION VERIFICATION
# ============================================================================

test_section "TEST 4: UUID Migration Verification"

# Test 4.1: Check if customers return UUIDs
echo "4.1: Verifying customers use UUID..."
CUSTOMERS=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" $API_URL/customers)

# Check if ID is UUID format (contains hyphens)
if echo "$CUSTOMERS" | grep -q '"id":"[a-f0-9-]*"'; then
    test_passed "Customer IDs are UUIDs"
else
    test_failed "Customer UUID format" "IDs are not in UUID format"
    echo "Response sample: $(echo $CUSTOMERS | head -c 200)"
fi

# Test 4.2: Check if users return UUIDs
echo "4.2: Verifying users use UUID..."
USERS=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" $API_URL/users)

if echo "$USERS" | grep -q '"id":"[a-f0-9-]*"'; then
    test_passed "User IDs are UUIDs"
else
    test_failed "User UUID format" "User IDs are not UUIDs"
fi

# ============================================================================
# TEST 5: CUSTOMER MANAGEMENT
# ============================================================================

test_section "TEST 5: Customer Management"

# Test 5.1: Create customer
echo "5.1: Creating a new customer..."
TIMESTAMP=$(date +%s)
CREATE_CUSTOMER=$(curl -s -X POST $API_URL/customers \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Customer $TIMESTAMP\",
    \"email\": \"test$TIMESTAMP@test.com\",
    \"phone\": \"+25471234$TIMESTAMP\",
    \"address\": \"123 Test Street, Nairobi\"
  }")

if echo "$CREATE_CUSTOMER" | grep -q "success.*true"; then
    CUSTOMER_ID=$(echo $CREATE_CUSTOMER | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    test_passed "Customer created successfully (ID: ${CUSTOMER_ID:0:8}...)"
else
    test_failed "Customer creation" "Failed to create customer"
    echo "Response: $CREATE_CUSTOMER"
fi

# Test 5.2: Get customer by ID
if [ ! -z "$CUSTOMER_ID" ]; then
    echo "5.2: Retrieving customer by UUID..."
    GET_CUSTOMER=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" $API_URL/customers/$CUSTOMER_ID)
    
    if echo "$GET_CUSTOMER" | grep -q "Test Customer"; then
        test_passed "Customer retrieval by UUID working"
    else
        test_failed "Customer retrieval" "Failed to get customer by UUID"
    fi
fi

# Test 5.3: Update customer
if [ ! -z "$CUSTOMER_ID" ]; then
    echo "5.3: Updating customer..."
    UPDATE_CUSTOMER=$(curl -s -X PATCH $API_URL/customers/$CUSTOMER_ID \
      -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Updated Test Customer"
      }')
    
    if echo "$UPDATE_CUSTOMER" | grep -q "Updated Test Customer"; then
        test_passed "Customer update successful"
    else
        test_failed "Customer update" "Failed to update customer"
    fi
fi

# ============================================================================
# TEST 6: JOB CARD MANAGEMENT
# ============================================================================

test_section "TEST 6: Job Card Management"

# Get a technician ID first
TECH_ID=$(echo $USERS | grep -o '"id":"[^"]*' | cut -d'"' -f4 | head -1)

if [ ! -z "$CUSTOMER_ID" ] && [ ! -z "$TECH_ID" ]; then
    # Test 6.1: Create job card
    echo "6.1: Creating a job card..."
    CREATE_JOB=$(curl -s -X POST $API_URL/job-cards \
      -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"customer_id\": \"$CUSTOMER_ID\",
        \"technician_id\": \"$TECH_ID\",
        \"title\": \"Test Job - Printer Maintenance\",
        \"description\": \"Annual maintenance check\",
        \"priority\": \"medium\",
        \"scheduled_date\": \"2026-03-01\"
      }")
    
    if echo "$CREATE_JOB" | grep -q "success.*true"; then
        JOB_ID=$(echo $CREATE_JOB | grep -o '"id":"[^"]*' | cut -d'"' -f4)
        test_passed "Job card created successfully (ID: ${JOB_ID:0:8}...)"
    else
        test_failed "Job card creation" "Failed to create job card"
        echo "Response: $CREATE_JOB"
    fi
    
    # Test 6.2: Get job card by UUID
    if [ ! -z "$JOB_ID" ]; then
        echo "6.2: Retrieving job card by UUID..."
        GET_JOB=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" $API_URL/job-cards/$JOB_ID)
        
        if echo "$GET_JOB" | grep -q "Test Job"; then
            test_passed "Job card retrieval by UUID working"
        else
            test_failed "Job card retrieval" "Failed to get job by UUID"
        fi
    fi
    
    # Test 6.3: Update job card
    if [ ! -z "$JOB_ID" ]; then
        echo "6.3: Updating job card status..."
        UPDATE_JOB=$(curl -s -X PATCH $API_URL/job-cards/$JOB_ID \
          -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "status": "in_progress"
          }')
        
        if echo "$UPDATE_JOB" | grep -q "in_progress"; then
            test_passed "Job card update successful"
        else
            test_failed "Job card update" "Failed to update job status"
        fi
    fi
else
    test_failed "Job card tests" "Missing customer or technician ID"
fi

# ============================================================================
# TEST 7: AUTHORIZATION (RBAC)
# ============================================================================

test_section "TEST 7: Role-Based Access Control"

# Test 7.1: Technician cannot create job cards
echo "7.1: Testing technician cannot create job cards..."
TECH_CREATE_JOB=$(curl -s -X POST $API_URL/job-cards \
  -H "Authorization: Bearer $TECH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"customer_id\": \"$CUSTOMER_ID\",
    \"technician_id\": \"$TECH_ID\",
    \"title\": \"Unauthorized Job\",
    \"scheduled_date\": \"2026-03-01\"
  }")

if echo "$TECH_CREATE_JOB" | grep -q "Forbidden\|forbidden\|403"; then
    test_passed "Technician properly blocked from creating jobs"
else
    test_failed "RBAC - Job creation" "Technician should not create jobs"
    echo "Response: $TECH_CREATE_JOB"
fi

# Test 7.2: Technician cannot delete users
echo "7.2: Testing technician cannot delete users..."
TECH_DELETE=$(curl -s -X DELETE $API_URL/users/$TECH_ID \
  -H "Authorization: Bearer $TECH_TOKEN")

if echo "$TECH_DELETE" | grep -q "Forbidden\|forbidden\|403"; then
    test_passed "Technician properly blocked from deleting users"
else
    test_failed "RBAC - User deletion" "Technician should not delete users"
fi

# ============================================================================
# TEST 8: RATE LIMITING
# ============================================================================

test_section "TEST 8: Rate Limiting"

echo "8.1: Testing auth rate limiting (will try 6 login attempts)..."
echo "   This should block after 5 attempts..."

BLOCKED=false
for i in {1..6}; do
    RATE_TEST=$(curl -s -X POST $API_URL/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "wrong@test.com",
        "password": "wrong"
      }')
    
    if echo "$RATE_TEST" | grep -q "Too many"; then
        BLOCKED=true
        break
    fi
    sleep 0.5
done

if [ "$BLOCKED" = true ]; then
    test_passed "Rate limiting is working (blocked after 5 attempts)"
else
    test_failed "Rate limiting" "Should block after 5 login attempts"
fi

# ============================================================================
# TEST 9: XSS PROTECTION
# ============================================================================

test_section "TEST 9: XSS Protection"

echo "9.1: Testing XSS sanitization on customer creation..."
XSS_TEST=$(curl -s -X POST $API_URL/customers \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"<script>alert('XSS')</script>SafeCompany\",
    \"email\": \"xss$(date +%s)@test.com\",
    \"phone\": \"+254712$(date +%s | tail -c 7)\",
    \"address\": \"<img src=x onerror='alert(1)'>123 Safe Street\"
  }")

if echo "$XSS_TEST" | grep -q "SafeCompany"; then
    if echo "$XSS_TEST" | grep -q "<script>"; then
        test_failed "XSS Protection" "Script tags not removed"
        echo "Response: $XSS_TEST"
    else
        test_passed "XSS sanitization working (script tags removed)"
    fi
else
    test_failed "XSS Protection test" "Could not verify sanitization"
fi

# ============================================================================
# TEST 10: CORS CONFIGURATION
# ============================================================================

test_section "TEST 10: CORS Configuration"

echo "10.1: Testing CORS allows localhost..."
CORS_TEST=$(curl -s -H "Origin: http://localhost:5173" $API_URL/health)

if echo "$CORS_TEST" | grep -q "success"; then
    test_passed "CORS allows localhost:5173"
else
    test_failed "CORS configuration" "Should allow localhost"
fi

# ============================================================================
# TEST 11: INPUT VALIDATION
# ============================================================================

test_section "TEST 11: Input Validation"

echo "11.1: Testing invalid email format..."
INVALID_EMAIL=$(curl -s -X POST $API_URL/customers \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "email": "not-an-email",
    "phone": "+254712345678",
    "address": "123 Test St"
  }')

if echo "$INVALID_EMAIL" | grep -q "valid.*email\|Validation"; then
    test_passed "Email validation working"
else
    test_failed "Email validation" "Should reject invalid email"
fi

echo "11.2: Testing missing required fields..."
MISSING_FIELDS=$(curl -s -X POST $API_URL/customers \
  -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company"
  }')

if echo "$MISSING_FIELDS" | grep -q "required\|Validation"; then
    test_passed "Required field validation working"
else
    test_failed "Required field validation" "Should reject missing fields"
fi

# ============================================================================
# TEST 12: ERROR HANDLING
# ============================================================================

test_section "TEST 12: Error Handling"

echo "12.1: Testing 404 for non-existent route..."
NOT_FOUND=$(curl -s $API_URL/this-route-does-not-exist)

if echo "$NOT_FOUND" | grep -q "not found\|404"; then
    test_passed "404 error handling working"
else
    test_failed "404 handling" "Should return not found error"
fi

echo "12.2: Testing invalid UUID format..."
INVALID_UUID=$(curl -s -H "Authorization: Bearer $SUPERVISOR_TOKEN" \
  $API_URL/customers/not-a-valid-uuid)

if echo "$INVALID_UUID" | grep -q "error\|not found\|invalid"; then
    test_passed "Invalid UUID handling working"
else
    test_failed "Invalid UUID handling" "Should reject invalid UUID"
fi

# ============================================================================
# CLEANUP
# ============================================================================

test_section "CLEANUP"

echo "Cleaning up test data..."

# Delete test customer (if created)
if [ ! -z "$CUSTOMER_ID" ]; then
    curl -s -X DELETE $API_URL/customers/$CUSTOMER_ID \
      -H "Authorization: Bearer $SUPERVISOR_TOKEN" > /dev/null
    echo "✓ Test customer deleted"
fi

# Delete test job (if created)
if [ ! -z "$JOB_ID" ]; then
    curl -s -X DELETE $API_URL/job-cards/$JOB_ID \
      -H "Authorization: Bearer $SUPERVISOR_TOKEN" > /dev/null
    echo "✓ Test job card deleted"
fi

# ============================================================================
# FINAL RESULTS
# ============================================================================

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      TEST RESULTS SUMMARY                      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✓ Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}✗ Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  🎉 ALL TESTS PASSED! 🎉                      ║${NC}"
    echo -e "${GREEN}║            Your system is ready for presentation!             ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ⚠️  TESTS FAILED  ⚠️                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Failed tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
        echo -e "${RED}  • $test${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please fix the issues above before presentation.${NC}"
    exit 1
fi
