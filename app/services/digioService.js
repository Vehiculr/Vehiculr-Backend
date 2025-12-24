const axios = require('axios');
const crypto = require('crypto');

class DigioKYCService {
  constructor() {
    this.clientId = process.env.DIGIO_CLIENT_ID;
    this.clientSecret = process.env.DIGIO_CLIENT_SECRET;
    this.apiKey = process.env.DIGIO_API_KEY;
    
    // Check if credentials are set
    const hasCredentials = this.clientId && this.clientSecret && this.apiKey;
    
    if (!hasCredentials) {
      console.warn('⚠️  Digio credentials missing. Running in MOCK mode.');
      console.warn('   Set DIGIO_CLIENT_ID, DIGIO_CLIENT_SECRET, DIGIO_API_KEY in .env for real API calls');
      this.isMockMode = true;
      this.baseURL = null; // No API calls in mock mode
    } else {
      this.isMockMode = false;
      
      // Determine environment - use production if NODE_ENV is production, otherwise sandbox
      this.baseURL = process.env.NODE_ENV === 'production' 
        ? 'https://api.digio.in/v3/client/kyc'
        : 'https://api-sandbox.digio.in/v3/client/kyc';
      
      console.log(`🌐 Using Digio ${process.env.NODE_ENV === 'production' ? 'Production' : 'Sandbox'} API`);
      
      // Create basic auth header
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      this.axiosInstance = axios.create({
        baseURL: this.baseURL,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 seconds
      });
    }
  }

  /**
   * Generate OTP for Aadhaar verification
   */
  async generateAadhaarOTP(aadhaarNumber, userData = {}) {
    try {
      // Validate Aadhaar number
      if (!/^\d{12}$/.test(aadhaarNumber)) {
        throw new Error('Invalid Aadhaar number format');
      }
      // MOCK RESPONSE if credentials missing
      if (this.isMockMode) {
          console.log(`[MOCK] Generating OTP for Aadhaar: ${aadhaarNumber.substring(0, 4)}XXXX${aadhaarNumber.substring(8)}`);
          
          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
              success: true,
              transactionId: `MOCK_TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              message: 'OTP sent successfully (MOCK MODE)',
              validFor: 300,
              isMock: true
            };
        }
        
        // REAL DIGIO API CALL
        const payload = {
        aadhaar_number: aadhaarNumber,
        consent: 'Y',
        purpose: 'Vehicle Registration and KYC Verification',
        client_data: {
          user_id: userData.userId || this.generateUserId(),
          mobile: userData.mobile || '',
          email: userData.email || '',
          reference_id: userData.referenceId || ''
        }
      };
      const response = await this.axiosInstance.post('/aadhaar/otp', payload);
      console.log("==response==>>>:", response);
      
      if (response.data.status === 'success') {
        return {
          success: true,
          transactionId: response.data.transaction_id,
          message: 'OTP sent successfully',
          validFor: response.data.valid_for || 300,
          isMock: false
        };
      } else {
        return {
          success: false,
          error: response.data.message,
          errorCode: response.data.error_code,
          isMock: false
        };
      }
    } catch (error) {
      console.error('Digio OTP Generation Error:', error.response?.data || error.message);
      
      // If it's a network error but we have credentials, show specific message
      if (!this.isMockMode && error.code === 'ENOTFOUND') {
        console.error('❌ Network Error: Cannot reach Digio servers. Check your internet connection.');
        return {
          success: false,
          error: 'Network connection failed. Cannot reach Digio servers.',
          isNetworkError: true,
          isMock: false
        };
      }
      
      return {
        success: false,
        error: this.parseError(error),
        retryAfter: error.response?.headers['retry-after'] || 60,
        isMock: this.isMockMode
      };
    }
  }

  /**
   * Verify OTP and get KYC data
   */
  async verifyAadhaarOTP(transactionId, otp) {
    try {
      if (!/^\d{6}$/.test(otp)) {
        throw new Error('Invalid OTP format');
      }

      // MOCK RESPONSE if credentials missing
      if (this.isMockMode) {
        console.log(`[MOCK] Verifying OTP: ${otp} for transaction: ${transactionId}`);
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock KYC data with realistic Indian names and addresses
        const mockNames = [
          'RAHUL SHARMA', 'PRIYA PATEL', 'AMIT KUMAR', 'SUNITA SINGH', 
          'VIJAY VERMA', 'ANJALI DESAI', 'RAJESH MEHTA', 'KAVITA REDDY'
        ];
        const mockAddresses = [
          'H NO 123, XYZ COLONY, DELHI - 110001',
          'FLAT 45, SUNRISE APARTMENTS, MUMBAI - 400001',
          'PLOT NO 67, GREEN PARK, BANGALORE - 560001',
          'HOUSE NO 89, LAKSHMI NAGAR, CHENNAI - 600001'
        ];
        
        const randomName = mockNames[Math.floor(Math.random() * mockNames.length)];
        const randomAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
        
        const kycData = {
          aadhaarNumber: '999900001111',
          name: randomName,
          firstName: randomName.split(' ')[0],
          lastName: randomName.split(' ')[1] || '',
          gender: Math.random() > 0.5 ? 'M' : 'F',
          dateOfBirth: `15-08-${1980 + Math.floor(Math.random() * 20)}`,
          yearOfBirth: `${1980 + Math.floor(Math.random() * 20)}`,
          age: 25 + Math.floor(Math.random() * 30),
          address: {
            full: randomAddress,
            careOf: `S/O ${randomName.split(' ')[0]} ${randomName.split(' ')[1] || 'SHARMA'}`,
            district: randomAddress.includes('DELHI') ? 'NEW DELHI' : 
                     randomAddress.includes('MUMBAI') ? 'MUMBAI' :
                     randomAddress.includes('BANGALORE') ? 'BANGALORE' : 'CHENNAI',
            state: randomAddress.includes('DELHI') ? 'DELHI' :
                   randomAddress.includes('MUMBAI') ? 'MAHARASHTRA' :
                   randomAddress.includes('BANGALORE') ? 'KARNATAKA' : 'TAMIL NADU',
            pincode: randomAddress.includes('110001') ? '110001' :
                     randomAddress.includes('400001') ? '400001' :
                     randomAddress.includes('560001') ? '560001' : '600001',
            country: 'India'
          },
          contact: {
            mobile: `98765${Math.floor(10000 + Math.random() * 90000)}`,
            email: `${randomName.split(' ')[0].toLowerCase()}@example.com`,
            mobileVerified: true,
            emailVerified: Math.random() > 0.5
          },
          photo: 'mock_photo_url',
          isVerified: true,
          verificationMethod: 'AADHAAR_OTP',
          verificationTimestamp: new Date().toISOString()
        };
        
        return {
          success: true,
          kycData: kycData,
          digioReferenceId: `MOCK_DIGIO_REF_${Date.now()}`,
          timestamp: new Date().toISOString(),
          isMock: true
        };
      }

      // REAL DIGIO API CALL
      const payload = {
        transaction_id: transactionId,
        otp: otp
      };

      const response = await this.axiosInstance.post('/aadhaar/verify', payload);
      
      if (response.data.status === 'success') {
        // Transform and sanitize data
        const kycData = this.transformKYCData(response.data.data);
        
        return {
          success: true,
          kycData: kycData,
          digioReferenceId: response.data.digio_reference_id,
          timestamp: response.data.verification_timestamp,
          isMock: false
        };
      } else {
        return {
          success: false,
          error: response.data.message,
          errorCode: response.data.error_code,
          isMock: false
        };
      }
    } catch (error) {
      console.error('Digio OTP Verification Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: this.parseError(error),
        isRetryable: this.isRetryableError(error),
        isMock: this.isMockMode
      };
    }
  }

  /**
   * Transform KYC data to standardized format
   */
  transformKYCData(rawData) {
    return {
      aadhaarNumber: rawData.aadhaar_number,
      name: rawData.name,
      firstName: this.extractFirstName(rawData.name),
      lastName: this.extractLastName(rawData.name),
      gender: this.mapGender(rawData.gender),
      dateOfBirth: rawData.date_of_birth,
      yearOfBirth: rawData.year_of_birth,
      age: this.calculateAge(rawData.date_of_birth),
      address: {
        full: rawData.address?.full_address,
        careOf: rawData.care_of,
        district: rawData.address?.district,
        state: rawData.address?.state,
        pincode: rawData.address?.pincode,
        country: rawData.address?.country || 'India'
      },
      contact: {
        mobile: rawData.mobile_number,
        email: rawData.email,
        mobileVerified: !!rawData.mobile_number,
        emailVerified: !!rawData.email
      },
      photo: rawData.photo,
      isVerified: true,
      verificationMethod: 'AADHAAR_OTP',
      verificationTimestamp: new Date().toISOString()
    };
  }

  /**
   * Utility: Generate unique user ID
   */
  generateUserId() {
    return `USER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract first name
   */
  extractFirstName(fullName) {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  }

  /**
   * Extract last name
   */
  extractLastName(fullName) {
    if (!fullName) return '';
    const parts = fullName.split(' ');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  /**
   * Map gender codes
   */
  mapGender(genderCode) {
    const map = { 'M': 'Male', 'F': 'Female', 'T': 'Transgender' };
    return map[genderCode] || genderCode;
  }

  /**
   * Calculate age from DOB
   */
  calculateAge(dob) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Parse API errors
   */
  parseError(error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          return `Bad Request: ${data.message || 'Invalid input parameters'}`;
        case 401:
          return 'Authentication failed. Check your API credentials.';
        case 403:
          return 'Access forbidden. Verify your account permissions.';
        case 429:
          return 'Rate limit exceeded. Please try again later.';
        case 500:
          return 'Digio server error. Please contact support.';
        default:
          return data.message || `HTTP ${status}: ${error.message}`;
      }
    }
    return error.message || 'Network error. Please check your connection.';
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (!error.response) return true; // Network errors are retryable
    const status = error.response.status;
    // Retry on 5xx errors, rate limits (429), and timeouts
    return status >= 500 || status === 429 || status === 408;
  }

  /**
   * Check transaction status
   */
  async checkStatus(transactionId) {
    try {
      // MOCK RESPONSE if in mock mode
      if (this.isMockMode) {
        return {
          success: true,
          status: 'completed',
          kycStatus: 'VERIFIED',
          lastUpdated: new Date().toISOString(),
          isMock: true
        };
      }

      const response = await this.axiosInstance.get(`/aadhaar/status/${transactionId}`);
      return {
        success: true,
        status: response.data.status,
        kycStatus: response.data.kyc_status,
        lastUpdated: response.data.last_updated,
        isMock: false
      };
    } catch (error) {
      return {
        success: false,
        error: this.parseError(error),
        isMock: this.isMockMode
      };
    }
  }
  
  /**
   * Get service mode (mock, sandbox, production)
   */
  getServiceMode() {
    if (this.isMockMode) {
      return 'MOCK';
    }
    return process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX';
  }
}

module.exports = DigioKYCService;