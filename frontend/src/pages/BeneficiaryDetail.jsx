import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Zap, FileText, Save, Sparkles } from 'lucide-react';

const BeneficiaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [consumption, setConsumption] = useState({
    electricity_kwh: '',
    mobile_recharge_monthly: '',
    utility_bill_avg: ''
  });

  useEffect(() => {
    loadBeneficiary();
  }, [id]);

  const loadBeneficiary = async () => {
    try {
      const response = await axios.get(`${API}/beneficiaries/${id}`);
      setBeneficiary(response.data);
      if (response.data.consumption_data) {
        setConsumption({
          electricity_kwh: response.data.consumption_data.electricity_kwh || '',
          mobile_recharge_monthly: response.data.consumption_data.mobile_recharge_monthly || '',
          utility_bill_avg: response.data.consumption_data.utility_bill_avg || ''
        });
      }
    } catch (error) {
      toast.error('Failed to load beneficiary');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    setCalculating(true);
    try {
      const response = await axios.post(`${API}/beneficiaries/${id}/score`);
      setScoreResult(response.data);
      toast.success('Credit score calculated successfully!');
      await loadBeneficiary();
    } catch (error) {
      toast.error('Failed to calculate score');
    } finally {
      setCalculating(false);
    }
  };

  const updateConsumption = async () => {
    try {
      await axios.put(`${API}/beneficiaries/${id}/consumption`, {
        electricity_kwh: parseFloat(consumption.electricity_kwh) || null,
        mobile_recharge_monthly: parseFloat(consumption.mobile_recharge_monthly) || null,
        utility_bill_avg: parseFloat(consumption.utility_bill_avg) || null
      });
      toast.success('Consumption data updated!');
      await loadBeneficiary();
    } catch (error) {
      toast.error('Failed to update consumption data');
    }
  };

  const applyLoan = async () => {
    try {
      if (!beneficiary.credit_score) {
        toast.error('Please calculate credit score first');
        return;
      }
      await axios.post(`${API}/loans/apply`, {
        beneficiary_id: beneficiary.id,
        loan_amount: beneficiary.loan_amount,
        loan_purpose: 'Business expansion'
      });
      toast.success('Loan application submitted!');
      navigate('/loans');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply for loan');
    }
  };

  const getRiskColor = (riskBand) => {
    if (!riskBand) return 'bg-gray-500';
    if (riskBand.includes('Low Risk')) return 'bg-green-500';
    if (riskBand.includes('Medium Risk')) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-8" data-testid="beneficiary-detail-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button onClick={() => navigate('/')} variant="outline" data-testid="back-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card data-testid="beneficiary-info-card">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl text-teal-900">{beneficiary.name}</CardTitle>
                    <p className="text-teal-600">{beneficiary.business_type}</p>
                  </div>
                  {beneficiary.risk_band && (
                    <Badge className={`${getRiskColor(beneficiary.risk_band)} text-white px-4 py-2`}>
                      {beneficiary.risk_band}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-teal-600">Age</p>
                  <p className="text-xl font-semibold text-teal-900">{beneficiary.age} years</p>
                </div>
                <div>
                  <p className="text-sm text-teal-600">Loan Amount</p>
                  <p className="text-xl font-semibold text-teal-900">₹{beneficiary.loan_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-teal-600">Loan Tenure</p>
                  <p className="text-xl font-semibold text-teal-900">{beneficiary.loan_tenure_months} months</p>
                </div>
                <div>
                  <p className="text-sm text-teal-600">Repayment Records</p>
                  <p className="text-xl font-semibold text-teal-900">{beneficiary.repayment_history?.length || 0}</p>
                </div>
                {beneficiary.income_category && (
                  <div className="col-span-2">
                    <p className="text-sm text-teal-600">Income Category</p>
                    <p className="text-xl font-semibold text-teal-900">{beneficiary.income_category}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="consumption-data-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-teal-600" />
                  Consumption Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="electricity">Electricity Usage (kWh/month)</Label>
                  <Input
                    id="electricity"
                    type="number"
                    placeholder="e.g., 150"
                    value={consumption.electricity_kwh}
                    onChange={(e) => setConsumption({ ...consumption, electricity_kwh: e.target.value })}
                    data-testid="electricity-input"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Recharge (₹/month)</Label>
                  <Input
                    id="mobile"
                    type="number"
                    placeholder="e.g., 300"
                    value={consumption.mobile_recharge_monthly}
                    onChange={(e) => setConsumption({ ...consumption, mobile_recharge_monthly: e.target.value })}
                    data-testid="mobile-input"
                  />
                </div>
                <div>
                  <Label htmlFor="utility">Average Utility Bill (₹/month)</Label>
                  <Input
                    id="utility"
                    type="number"
                    placeholder="e.g., 1500"
                    value={consumption.utility_bill_avg}
                    onChange={(e) => setConsumption({ ...consumption, utility_bill_avg: e.target.value })}
                    data-testid="utility-input"
                  />
                </div>
                <Button onClick={updateConsumption} className="w-full" data-testid="save-consumption-button">
                  <Save className="w-4 h-4 mr-2" />
                  Save Consumption Data
                </Button>
              </CardContent>
            </Card>

            {scoreResult && (
              <Card data-testid="score-result-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-teal-700">{scoreResult.explanation}</p>
                  <div>
                    <p className="font-semibold text-teal-900 mb-2">Recommendations:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {scoreResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-teal-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {beneficiary.credit_score ? (
              <Card data-testid="credit-score-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-teal-600" />
                    Credit Score
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-teal-900 mb-2">
                      {beneficiary.credit_score.toFixed(0)}
                    </div>
                    <p className="text-teal-600">out of 100</p>
                  </div>
                  <Progress value={beneficiary.credit_score} className="h-3" />
                  <Button onClick={calculateScore} disabled={calculating} className="w-full" data-testid="recalculate-score-button">
                    {calculating ? 'Calculating...' : 'Recalculate Score'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card data-testid="calculate-score-card">
                <CardHeader>
                  <CardTitle>Calculate Credit Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-teal-600 mb-4">
                    Generate an AI-powered credit score based on repayment history and consumption data.
                  </p>
                  <Button onClick={calculateScore} disabled={calculating} className="w-full" data-testid="calculate-score-button">
                    {calculating ? 'Calculating...' : 'Calculate Score'}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card data-testid="apply-loan-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-600" />
                  Digital Lending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-teal-600 mb-4">
                  Apply for direct digital lending with instant approval based on credit score.
                </p>
                <Button
                  onClick={applyLoan}
                  disabled={!beneficiary.credit_score}
                  className="w-full"
                  data-testid="apply-loan-button"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Apply for Loan
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="repayment-history-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-teal-600" />
                  Repayment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {beneficiary.repayment_history && beneficiary.repayment_history.length > 0 ? (
                  <div className="space-y-2">
                    {beneficiary.repayment_history.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-teal-50 rounded">
                        <div>
                          <p className="text-sm font-semibold text-teal-900">{record.loan_id}</p>
                          <p className="text-xs text-teal-600">₹{record.amount_paid.toLocaleString()}</p>
                        </div>
                        <Badge
                          className={
                            record.status === 'on_time' ? 'bg-green-500' :
                            record.status === 'delayed' ? 'bg-yellow-500' :
                            'bg-red-500'
                          }
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-teal-600 text-sm">No repayment history</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeneficiaryDetail;
