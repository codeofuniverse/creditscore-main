from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION = 24  # hours

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    token: str
    user: User

class ConsumptionData(BaseModel):
    electricity_kwh: Optional[float] = None
    mobile_recharge_monthly: Optional[float] = None
    utility_bill_avg: Optional[float] = None

class RepaymentRecord(BaseModel):
    loan_id: str
    amount_paid: float
    payment_date: datetime
    status: str  # 'on_time', 'delayed', 'missed'

class Beneficiary(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    age: int
    business_type: str
    loan_amount: float
    loan_tenure_months: int
    repayment_history: List[RepaymentRecord] = []
    consumption_data: Optional[ConsumptionData] = None
    credit_score: Optional[float] = None
    risk_band: Optional[str] = None
    income_category: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BeneficiaryCreate(BaseModel):
    name: str
    age: int
    business_type: str
    loan_amount: float
    loan_tenure_months: int
    consumption_data: Optional[ConsumptionData] = None

class CreditScoreResult(BaseModel):
    credit_score: float
    risk_band: str
    income_category: str
    explanation: str
    recommendations: List[str]

class LoanApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    beneficiary_id: str
    loan_amount: float
    loan_purpose: str
    status: str  # 'pending', 'approved', 'rejected'
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None

class LoanApplicationCreate(BaseModel):
    beneficiary_id: str
    loan_amount: float
    loan_purpose: str

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION)
    payload = {"user_id": user_id, "exp": expiration}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def calculate_credit_score(beneficiary: Dict[str, Any]) -> tuple:
    """Calculate credit score based on repayment history and consumption data"""
    score_components = []
    
    # Repayment Score (40% weight)
    repayment_history = beneficiary.get('repayment_history', [])
    if repayment_history:
        on_time = sum(1 for r in repayment_history if r.get('status') == 'on_time')
        total = len(repayment_history)
        repayment_score = (on_time / total) * 40
        score_components.append(repayment_score)
    else:
        score_components.append(20)  # Default moderate score for new beneficiaries
    
    # Consumption-based Income Score (30% weight)
    consumption = beneficiary.get('consumption_data', {})
    if consumption:
        electricity = consumption.get('electricity_kwh', 0) or 0
        mobile = consumption.get('mobile_recharge_monthly', 0) or 0
        utility = consumption.get('utility_bill_avg', 0) or 0
        
        # Normalize consumption metrics
        consumption_score = 0
        if electricity > 0:
            # Higher electricity (up to threshold) indicates better income
            consumption_score += min((electricity / 300) * 10, 10)
        if mobile > 0:
            consumption_score += min((mobile / 500) * 10, 10)
        if utility > 0:
            consumption_score += min((utility / 2000) * 10, 10)
        
        score_components.append(consumption_score)
    else:
        score_components.append(15)  # Default score without consumption data
    
    # Loan Utilization Score (20% weight)
    loan_amount = beneficiary.get('loan_amount', 0)
    if 10000 <= loan_amount <= 100000:  # Optimal loan range
        utilization_score = 20
    elif loan_amount < 10000:
        utilization_score = 15
    else:
        utilization_score = 10
    score_components.append(utilization_score)
    
    # Tenure Score (10% weight)
    tenure = beneficiary.get('loan_tenure_months', 12)
    if 12 <= tenure <= 36:
        tenure_score = 10
    else:
        tenure_score = 5
    score_components.append(tenure_score)
    
    # Calculate final score (0-100)
    final_score = sum(score_components)
    
    # Determine Risk Band
    consumption = beneficiary.get('consumption_data', {})
    has_consumption = consumption and any([
        consumption.get('electricity_kwh'),
        consumption.get('mobile_recharge_monthly'),
        consumption.get('utility_bill_avg')
    ])
    
    # Income category based on consumption
    if has_consumption:
        electricity = consumption.get('electricity_kwh', 0) or 0
        mobile = consumption.get('mobile_recharge_monthly', 0) or 0
        total_consumption = electricity + mobile
        
        if total_consumption > 500:
            income_category = "Medium Income"
        elif total_consumption > 200:
            income_category = "Low-Medium Income"
        else:
            income_category = "Low Income"
    else:
        income_category = "Income Not Assessed"
    
    # Risk band classification
    if final_score >= 75:
        if income_category in ["Low Income", "Low-Medium Income"]:
            risk_band = "Low Risk - High Need"
        else:
            risk_band = "Low Risk - Low Need"
    elif final_score >= 50:
        if income_category in ["Low Income", "Low-Medium Income"]:
            risk_band = "Medium Risk - High Need"
        else:
            risk_band = "Medium Risk - Low Need"
    else:
        if income_category in ["Low Income", "Low-Medium Income"]:
            risk_band = "High Risk - High Need"
        else:
            risk_band = "High Risk - Low Need"
    
    return final_score, risk_band, income_category

async def generate_ai_explanation(beneficiary: Dict[str, Any], score: float, risk_band: str) -> tuple:
    """Generate AI-powered explanation for credit score"""
    try:
        chat = LlmChat(
            api_key=os.environ.get('EMERGENT_LLM_KEY'),
            session_id=f"credit_score_{beneficiary['id']}",
            system_message="You are a credit scoring expert for NBCFDC lending platform. Provide concise, professional explanations."
        ).with_model("openai", "gpt-4o-mini")
        
        prompt = f"""Analyze this beneficiary's credit profile:
        - Name: {beneficiary['name']}
        - Credit Score: {score:.2f}/100
        - Risk Band: {risk_band}
        - Loan Amount: ₹{beneficiary['loan_amount']}
        - Repayment History: {len(beneficiary.get('repayment_history', []))} records
        - Business Type: {beneficiary['business_type']}
        
        Provide:
        1. A brief explanation (2-3 sentences) of why they received this score
        2. Three specific recommendations to improve their creditworthiness
        
        Format as JSON: {{"explanation": "...", "recommendations": ["...", "...", "..."]}}"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse AI response
        import json
        ai_data = json.loads(response)
        return ai_data.get('explanation', 'Score calculated based on repayment history and consumption data.'), \
               ai_data.get('recommendations', ['Maintain regular repayments', 'Update consumption data', 'Build credit history'])
    except Exception as e:
        logging.error(f"AI explanation error: {e}")
        return "Score calculated based on repayment history, consumption patterns, and loan utilization.", \
               ["Maintain timely repayments", "Provide complete consumption data", "Build longer credit history"]

# Auth Routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_obj = User(username=user_data.username, email=user_data.email)
    user_dict = user_obj.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user_obj.id)
    
    return TokenResponse(token=token, user=user_obj)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_obj = User(**user)
    token = create_token(user_obj.id)
    
    return TokenResponse(token=token, user=user_obj)

# Borrower Auth Routes
@api_router.post("/borrower/register", response_model=TokenResponse)
async def borrower_register(data: BeneficiaryCreate):
    # Check if borrower exists
    existing = await db.beneficiaries.find_one({"email": data.email if hasattr(data, 'email') else None}, {"_id": 0})
    
    # Create beneficiary account
    beneficiary = Beneficiary(**data.model_dump())
    beneficiary_dict = beneficiary.model_dump()
    beneficiary_dict['email'] = data.email if hasattr(data, 'email') else f"{data.name.lower().replace(' ', '')}@borrower.com"
    beneficiary_dict['password'] = hash_password(data.password if hasattr(data, 'password') else 'password123')
    beneficiary_dict['created_at'] = beneficiary_dict['created_at'].isoformat()
    beneficiary_dict['repayment_history'] = [
        {**r, 'payment_date': r['payment_date'].isoformat()} 
        for r in beneficiary_dict['repayment_history']
    ]
    
    await db.beneficiaries.insert_one(beneficiary_dict)
    token = create_token(beneficiary.id)
    
    return TokenResponse(token=token, user=User(id=beneficiary.id, username=beneficiary.name, email=beneficiary_dict['email']))

@api_router.post("/borrower/login")
async def borrower_login(credentials: UserLogin):
    beneficiary = await db.beneficiaries.find_one({"email": credentials.email}, {"_id": 0})
    if not beneficiary or not verify_password(credentials.password, beneficiary.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(beneficiary['id'])
    return TokenResponse(
        token=token, 
        user=User(id=beneficiary['id'], username=beneficiary['name'], email=beneficiary['email'])
    )

# Borrower Dashboard Routes
@api_router.get("/borrower/me")
async def get_borrower_profile(current_user: User = Depends(get_current_user)):
    beneficiary = await db.beneficiaries.find_one({"id": current_user.id}, {"_id": 0})
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Borrower profile not found")
    return beneficiary

@api_router.get("/borrower/my-loans")
async def get_borrower_loans(current_user: User = Depends(get_current_user)):
    loans = await db.loan_applications.find({"beneficiary_id": current_user.id}, {"_id": 0}).to_list(100)
    return loans

# Beneficiary Routes
@api_router.get("/beneficiaries", response_model=List[Beneficiary])
async def get_beneficiaries(current_user: User = Depends(get_current_user)):
    beneficiaries = await db.beneficiaries.find({}, {"_id": 0}).to_list(1000)
    return beneficiaries

@api_router.post("/beneficiaries", response_model=Beneficiary)
async def create_beneficiary(data: BeneficiaryCreate, current_user: User = Depends(get_current_user)):
    beneficiary = Beneficiary(**data.model_dump())
    beneficiary_dict = beneficiary.model_dump()
    beneficiary_dict['created_at'] = beneficiary_dict['created_at'].isoformat()
    
    # Serialize repayment history
    beneficiary_dict['repayment_history'] = [
        {**r, 'payment_date': r['payment_date'].isoformat()} 
        for r in beneficiary_dict['repayment_history']
    ]
    
    await db.beneficiaries.insert_one(beneficiary_dict)
    return beneficiary

@api_router.get("/beneficiaries/{beneficiary_id}", response_model=Beneficiary)
async def get_beneficiary(beneficiary_id: str, current_user: User = Depends(get_current_user)):
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id}, {"_id": 0})
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    return Beneficiary(**beneficiary)

@api_router.post("/beneficiaries/{beneficiary_id}/score", response_model=CreditScoreResult)
async def calculate_score(beneficiary_id: str, current_user: User = Depends(get_current_user)):
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id}, {"_id": 0})
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    # Calculate score
    score, risk_band, income_category = calculate_credit_score(beneficiary)
    
    # Generate AI explanation
    explanation, recommendations = await generate_ai_explanation(beneficiary, score, risk_band)
    
    # Update beneficiary
    await db.beneficiaries.update_one(
        {"id": beneficiary_id},
        {"$set": {"credit_score": score, "risk_band": risk_band, "income_category": income_category}}
    )
    
    return CreditScoreResult(
        credit_score=score,
        risk_band=risk_band,
        income_category=income_category,
        explanation=explanation,
        recommendations=recommendations
    )

@api_router.put("/beneficiaries/{beneficiary_id}/consumption")
async def update_consumption(beneficiary_id: str, data: ConsumptionData, current_user: User = Depends(get_current_user)):
    beneficiary = await db.beneficiaries.find_one({"id": beneficiary_id}, {"_id": 0})
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    await db.beneficiaries.update_one(
        {"id": beneficiary_id},
        {"$set": {"consumption_data": data.model_dump()}}
    )
    
    return {"message": "Consumption data updated successfully"}

# Loan Application Routes
@api_router.post("/loans/apply", response_model=LoanApplication)
async def apply_loan(data: LoanApplicationCreate, current_user: User = Depends(get_current_user)):
    # Check beneficiary exists and has credit score
    beneficiary = await db.beneficiaries.find_one({"id": data.beneficiary_id}, {"_id": 0})
    if not beneficiary:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    
    if not beneficiary.get('credit_score'):
        raise HTTPException(status_code=400, detail="Beneficiary must have credit score calculated first")
    
    # Auto-approve based on credit score
    credit_score = beneficiary['credit_score']
    status = "approved" if credit_score >= 60 else "rejected"
    
    application = LoanApplication(
        beneficiary_id=data.beneficiary_id,
        loan_amount=data.loan_amount,
        loan_purpose=data.loan_purpose,
        status=status,
        processed_at=datetime.now(timezone.utc) if status != "pending" else None
    )
    
    app_dict = application.model_dump()
    app_dict['created_at'] = app_dict['created_at'].isoformat()
    if app_dict['processed_at']:
        app_dict['processed_at'] = app_dict['processed_at'].isoformat()
    
    await db.loan_applications.insert_one(app_dict)
    return application

@api_router.get("/loans", response_model=List[LoanApplication])
async def get_loan_applications(current_user: User = Depends(get_current_user)):
    applications = await db.loan_applications.find({}, {"_id": 0}).to_list(1000)
    return applications

# Mock Data Generation
@api_router.post("/mock-data/generate")
async def generate_mock_data(count: int = 10, current_user: User = Depends(get_current_user)):
    """Generate realistic mock beneficiary data"""
    business_types = ["Retail Shop", "Handicrafts", "Agriculture", "Small Manufacturing", "Services", "Food Business"]
    names = ["Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sunita Devi", "Vikram Singh", "Lakshmi Iyer", 
             "Ramesh Reddy", "Anjali Gupta", "Suresh Yadav", "Kavita Verma", "Mohan Das", "Meera Nair"]
    
    generated = []
    for i in range(count):
        # Generate repayment history
        num_loans = random.randint(1, 5)
        repayment_history = []
        for j in range(num_loans):
            status_choice = random.choices(
                ['on_time', 'delayed', 'missed'],
                weights=[0.7, 0.2, 0.1]
            )[0]
            repayment_history.append({
                "loan_id": f"LOAN{random.randint(1000, 9999)}",
                "amount_paid": random.uniform(5000, 50000),
                "payment_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 365))).isoformat(),
                "status": status_choice
            })
        
        # Generate consumption data
        consumption = {
            "electricity_kwh": random.uniform(50, 400),
            "mobile_recharge_monthly": random.uniform(100, 800),
            "utility_bill_avg": random.uniform(500, 3000)
        }
        
        beneficiary = {
            "id": str(uuid.uuid4()),
            "name": random.choice(names),
            "age": random.randint(25, 60),
            "business_type": random.choice(business_types),
            "loan_amount": random.uniform(10000, 200000),
            "loan_tenure_months": random.choice([12, 24, 36, 48]),
            "repayment_history": repayment_history,
            "consumption_data": consumption,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Calculate initial score
        score, risk_band, income_category = calculate_credit_score(beneficiary)
        beneficiary['credit_score'] = score
        beneficiary['risk_band'] = risk_band
        beneficiary['income_category'] = income_category
        
        await db.beneficiaries.insert_one(beneficiary)
        generated.append(beneficiary['id'])
    
    return {"message": f"Generated {count} mock beneficiaries", "ids": generated}

# Stats endpoint
@api_router.get("/stats")
async def get_stats(current_user: User = Depends(get_current_user)):
    total_beneficiaries = await db.beneficiaries.count_documents({})
    total_applications = await db.loan_applications.count_documents({})
    approved_loans = await db.loan_applications.count_documents({"status": "approved"})
    
    # Risk band distribution
    beneficiaries = await db.beneficiaries.find({"risk_band": {"$exists": True}}, {"_id": 0, "risk_band": 1}).to_list(1000)
    risk_distribution = {}
    for b in beneficiaries:
        band = b.get('risk_band', 'Unknown')
        risk_distribution[band] = risk_distribution.get(band, 0) + 1
    
    return {
        "total_beneficiaries": total_beneficiaries,
        "total_applications": total_applications,
        "approved_loans": approved_loans,
        "approval_rate": (approved_loans / total_applications * 100) if total_applications > 0 else 0,
        "risk_distribution": risk_distribution
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()