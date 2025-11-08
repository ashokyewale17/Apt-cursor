import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Save, X } from "lucide-react";

const AddEmployee = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    department: "Engineering",
    position: "",
    phone: "",
    role: "Employee",
    password: "",
    confirmPassword: "",
    hireDate: "",
    address: ""
  });

  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Basic validation
    if (formData.password !== formData.confirmPassword) {
      setMessage("❌ Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage("❌ Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          // employeeId is not part of schema; omit to avoid validation issues
          department: formData.department,
          position: formData.position,
          phone: formData.phone,
          role: (formData.role || 'Employee').toLowerCase() === 'admin' ? 'admin' : 'employee',
          password: formData.password,
          // hireDate maps to Employee.dateOfJoining if needed; backend sets default
          salary: 0, // Default salary value
          address: formData.address
        }),
      });

      if (response.ok) {
        setMessage("✅ Employee added successfully!");
        setFormData({
          name: "",
          email: "",
          employeeId: "",
          department: "Engineering",
          position: "",
          phone: "",
          role: "Employee",
          password: "",
          confirmPassword: "",
          hireDate: "",
          address: ""
        });
        // Navigate back to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/admin-dashboard');
        }, 2000);
      } else {
        const errorData = await response.json();
        setMessage(`❌ Failed to add employee: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("⚠️ Server error, try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin-dashboard');
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                <Users size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Add New Employee
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Create a new employee account in the system
              </p>
            </div>
            <button 
              onClick={handleCancel}
              style={{ 
                padding: '0.75rem 1.5rem', 
                border: 'none', 
                borderRadius: '0.5rem',
                background: '#ef4444',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-body">
            <div style={{ 
              padding: '1rem', 
              borderRadius: '0.5rem',
              background: message.includes('✅') ? 'var(--success-color-light)' : 
                          message.includes('❌') ? 'var(--danger-color-light)' : 'var(--warning-color-light)',
              color: message.includes('✅') ? 'var(--success-color)' : 
                     message.includes('❌') ? 'var(--danger-color)' : 'var(--warning-color)',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {message}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Employee Information</h3>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Personal Information */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem' }}>
                  Personal Information
                </h4>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="Enter full name"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="employee@company.com"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      resize: 'vertical',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Work Information */}
              <div>
                <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem' }}>
                  Work Information
                </h4>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="EMP001"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Department *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="HR">Human Resources</option>
                    <option value="Finance">Finance</option>
                    <option value="Design">Design</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Position *
                  </label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="Software Developer"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Role *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                  >
                    <option value="Employee">Employee</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Hire Date *
                  </label>
                  <input
                    type="date"
                    name="hireDate"
                    value={formData.hireDate}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '1rem', color: 'var(--text-primary)', borderBottom: '2px solid var(--primary-color)', paddingBottom: '0.5rem' }}>
                Account Security
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      background: '#ffffff',
                      color: '#1f2937'
                    }}
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '0.5rem',
                  background: 'white',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <X size={16} />
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: isLoading ? 'var(--text-secondary)' : 'var(--primary-color)',
                  color: 'white',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                <Save size={16} />
                {isLoading ? 'Adding Employee...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
