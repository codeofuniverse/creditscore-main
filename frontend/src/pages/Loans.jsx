import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText } from 'lucide-react';

const Loans = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const response = await axios.get(`${API}/loans`);
      setApplications(response.data);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 text-white">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500 text-white">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100">
        <div className="text-xl text-teal-700">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-4 md:p-8" data-testid="loans-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <Button onClick={() => navigate('/')} variant="outline" data-testid="back-to-dashboard-button">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div>
          <h1 className="text-4xl font-bold text-teal-900 mb-2" data-testid="loans-title">Loan Applications</h1>
          <p className="text-teal-600">Track all loan applications and approvals</p>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-teal-300 mx-auto mb-4" />
            <p className="text-teal-600 text-lg">No loan applications yet</p>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app, index) => (
              <Card key={app.id} className="card-hover" data-testid={`loan-card-${index}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-teal-900">Loan Application</CardTitle>
                    {getStatusBadge(app.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-teal-600">Application ID:</span>
                    <span className="font-semibold text-teal-900">{app.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600">Loan Amount:</span>
                    <span className="font-bold text-teal-900">₹{app.loan_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600">Purpose:</span>
                    <span className="font-semibold text-teal-900">{app.loan_purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-teal-600">Applied On:</span>
                    <span className="text-sm text-teal-900">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {app.processed_at && (
                    <div className="flex justify-between">
                      <span className="text-teal-600">Processed On:</span>
                      <span className="text-sm text-teal-900">
                        {new Date(app.processed_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Loans;
