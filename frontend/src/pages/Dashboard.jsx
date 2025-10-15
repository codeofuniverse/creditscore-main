import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext, API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Users, TrendingUp, FileCheck, PlusCircle, LogOut, 
  Search, Filter, BarChart3, DollarSign, Clock
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const Dashboard = () => {
  const { handleLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [beneficiariesRes, statsRes] = await Promise.all([
        axios.get(`${API}/beneficiaries`),
        axios.get(`${API}/stats`)
      ]);
      setBeneficiaries(beneficiariesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = async () => {
    try {
      setLoading(true);
      await axios.post(`${API}/mock-data/generate`, null, { params: { count: 10 } });
      toast.success('Mock data generated successfully!');
      await loadData();
    } catch (error) {
      toast.error('Failed to generate mock data');
      setLoading(false);
    }
  };

  const getRiskBadgeClass = (riskBand) => {
    if (!riskBand) return 'bg-gray-500';
    if (riskBand.includes('Low Risk')) return 'bg-green-500';
    if (riskBand.includes('Medium Risk')) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase()) ||
                         b.business_type.toLowerCase().includes(search.toLowerCase());
    const matchesRisk = filterRisk === 'all' || 
                       (b.risk_band && b.risk_band.toLowerCase().includes(filterRisk.toLowerCase()));
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-8" data-testid="dashboard-page">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-teal-900 mb-2" data-testid="dashboard-title">Credit Dashboard</h1>
            <p className="text-teal-600">Manage beneficiaries and credit scoring</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/loans')} variant="outline" data-testid="loans-nav-button">
              <FileCheck className="w-4 h-4 mr-2" />
              Loans
            </Button>
            <Button onClick={handleLogout} variant="outline" data-testid="logout-button">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="card-hover" data-testid="stat-card-beneficiaries">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Beneficiaries</CardTitle>
                <Users className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-900">{stats.total_beneficiaries}</div>
              </CardContent>
            </Card>
            <Card className="card-hover" data-testid="stat-card-applications">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Applications</CardTitle>
                <FileCheck className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-900">{stats.total_applications}</div>
              </CardContent>
            </Card>
            <Card className="card-hover" data-testid="stat-card-approved">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Loans</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-900">{stats.approved_loans}</div>
              </CardContent>
            </Card>
            <Card className="card-hover" data-testid="stat-card-approval-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-900">{stats.approval_rate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-teal-400" />
              <Input
                placeholder="Search beneficiaries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="search-input"
              />
            </div>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-4 py-2 border rounded-lg"
              data-testid="risk-filter"
            >
              <option value="all">All Risks</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
          <Button onClick={generateMockData} data-testid="generate-mock-data-button">
            <PlusCircle className="w-4 h-4 mr-2" />
            Generate Mock Data
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBeneficiaries.map((beneficiary, index) => (
            <Card
              key={beneficiary.id}
              className="card-hover cursor-pointer"
              onClick={() => navigate(`/beneficiary/${beneficiary.id}`)}
              data-testid={`beneficiary-card-${index}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-teal-900">{beneficiary.name}</CardTitle>
                    <CardDescription>{beneficiary.business_type}</CardDescription>
                  </div>
                  {beneficiary.risk_band && (
                    <Badge className={`${getRiskBadgeClass(beneficiary.risk_band)} text-white`}>
                      {beneficiary.risk_band.split(' - ')[0]}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-teal-600">Loan Amount:</span>
                  <span className="font-semibold text-teal-900">₹{beneficiary.loan_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-teal-600">Tenure:</span>
                  <span className="font-semibold text-teal-900">{beneficiary.loan_tenure_months} months</span>
                </div>
                {beneficiary.credit_score && (
                  <div className="flex justify-between text-sm">
                    <span className="text-teal-600">Credit Score:</span>
                    <span className="font-bold text-teal-900">{beneficiary.credit_score.toFixed(0)}/100</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-teal-600">Repayment Records:</span>
                  <span className="font-semibold text-teal-900">{beneficiary.repayment_history?.length || 0}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBeneficiaries.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-teal-300 mx-auto mb-4" />
            <p className="text-teal-600 text-lg">No beneficiaries found</p>
            <Button onClick={generateMockData} className="mt-4">
              Generate Sample Data
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
