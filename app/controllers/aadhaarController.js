const DigioKYCService = require('../services/digioService');
const { getLogger } = require('../utils/logger');
const Partner = require("../models/partnerModel");
const TransactionModel = require('../models/kyc-TransactionModel');
const kycService = new DigioKYCService();
const crypto = require('crypto');

// ✅ FIXED: Use getLogger correctly
const logger = getLogger(__filename);

class AadhaarController {
    /**
     * Generate OTP endpoint
     */
    async generateOTP(req, res) {
        try {
            const { aadhaar_number, mobile, email, user_id, partner_id } = req.body;

            // Validate input
            if (!aadhaar_number) {
                return res.status(400).json({
                    success: false,
                    error: 'Aadhaar number is required'
                });
            }

            // Log the request
            logger.info(`OTP Generation Request: ${aadhaar_number.substring(0, 4)}XXXX${aadhaar_number.substring(8)}`);

            const result = await kycService.generateAadhaarOTP(aadhaar_number, {
                mobile,
                email,
                userId: user_id || partner_id
            });
           console.log("Generate OTP result:", result);    
            if (result.success) {
                // ✅ FIXED: Store partnerId properly
                const storedTxn = await this.storeTransaction({
                    transactionId: result.transactionId,
                    aadhaarNumber: aadhaar_number,
                    status: 'OTP_SENT',
                    userId: user_id,
                    partnerId: partner_id || req.user?._id,
                    mobile: mobile,
                    isMock: result.isMock || false
                });

                res.json({
                    success: true,
                    message: result.message || 'OTP sent successfully',
                    transaction_id: result.transactionId,
                    valid_for: result.validFor || 300,
                    service_mode: kycService.getServiceMode(),
                    is_mock: result.isMock || false,
                    aadhaar_masked: `${aadhaar_number.substring(0, 4)}XXXX${aadhaar_number.substring(8)}`,
                    partner_id: partner_id || req.user?._id
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    error_code: result.errorCode,
                    is_network_error: result.isNetworkError || false,
                    service_mode: kycService.getServiceMode()
                });
            }
        } catch (error) {
            logger.error('Generate OTP Error:', error.message, error.stack);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                service_mode: kycService.getServiceMode()
            });
        }
    }

    /**
     * Verify OTP endpoint
     */
    async verifyOTP(req, res) {
        try {
            const { transaction_id, otp } = req.body;

            if (!transaction_id || !otp) {
                return res.status(400).json({
                    success: false,
                    error: 'Transaction ID and OTP are required'
                });
            }

            logger.info(`Verifying OTP for transaction: ${transaction_id}`);
            
            const result = await kycService.verifyAadhaarOTP(transaction_id, otp);
            
            if (result.success) {
                // ✅ FIXED: Get partnerId from findPartnerByTransactionId
                const partner = await this.findPartnerByTransactionId(transaction_id);
                
                if (!partner) {
                    return res.status(404).json({
                        success: false,
                        error: `No partner found for transaction: ${transaction_id}`
                    });
                }

                // Store KYC data
                const storedKYC = await this.storeKYCData(result.kycData, transaction_id, partner._id);
                
                // ✅ FIXED: Pass partnerId to updateTransaction
                await this.updateTransaction(partner._id, transaction_id, {
                    status: 'VERIFIED',
                    verifiedAt: new Date(),
                    digioReferenceId: result.digioReferenceId,
                    partnerId: storedKYC.partnerId
                });

                // Prepare response data
                const responseData = {
                    success: true,
                    message: 'KYC verification successful',
                    digio_reference_id: result.digioReferenceId,
                    verification_timestamp: result.timestamp,
                    service_mode: kycService.getServiceMode(),
                    is_mock: result.isMock || false,
                    kyc_data: {
                        name: result.kycData.name,
                        dob: result.kycData.dateOfBirth,
                        gender: result.kycData.gender,
                        address: result.kycData.address?.full,
                        aadhaar_masked: this.maskAadhaar(result.kycData.aadhaarNumber)
                    },
                    partner_id: storedKYC.partnerId,
                    garage_id: storedKYC.garageId
                };

                res.json(responseData);
            } else {
                // ✅ FIXED: Find partner before updating failed transaction
                const partner = await this.findPartnerByTransactionId(transaction_id);
                
                if (partner) {
                    await this.updateTransaction(partner._id, transaction_id, {
                        status: 'FAILED',
                        error: result.error,
                        errorCode: result.errorCode,
                        failedAt: new Date(),
                        partnerId: partner._id
                    });
                }

                res.status(400).json({
                    success: false,
                    error: result.error,
                    error_code: result.errorCode,
                    retry_available: true,
                    service_mode: kycService.getServiceMode(),
                    is_mock: result.isMock || false
                });
            }
        } catch (error) {
            logger.error('Verify OTP Error:', error.message, error.stack);
            res.status(500).json({
                success: false,
                error: 'Internal server error',
                service_mode: kycService.getServiceMode()
            });
        }
    }

    /**
     * Check status endpoint
     */
    async checkStatus(req, res) {
        try {
            const { transaction_id } = req.params;

            // ✅ FIXED: Check both Digio API and local database
            const digioResult = await kycService.checkStatus(transaction_id);
            const localTransaction = await TransactionModel.findOne({ transactionId: transaction_id });
            const partner = await Partner.findOne({ 'kyc.transactionId': transaction_id });

            if (digioResult.success) {
                res.json({
                    success: true,
                    status: digioResult.status,
                    kyc_status: digioResult.kycStatus,
                    last_updated: digioResult.lastUpdated,
                    service_mode: kycService.getServiceMode(),
                    is_mock: digioResult.isMock || false,
                    local_status: localTransaction?.status || partner?.kyc?.status,
                    partner_id: partner?._id || localTransaction?.partnerId,
                    garage_id: partner?.garageId
                });
            } else {
                // Fallback to local status
                if (localTransaction || partner) {
                    res.json({
                        success: true,
                        status: localTransaction?.status || partner?.kyc?.status,
                        kyc_status: partner?.verificationStatus,
                        last_updated: localTransaction?.updatedAt || partner?.updatedAt,
                        is_local: true,
                        partner_id: partner?._id || localTransaction?.partnerId,
                        garage_id: partner?.garageId
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Transaction not found'
                    });
                }
            }
        } catch (error) {
            logger.error('Check Status Error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Store transaction in database
     */
    async storeTransaction(data) {
        try {
            logger.info(`[STORE TXN] ${data.transactionId} - ${data.status}`);
            
            let transaction;

            // Try to store in TransactionModel if available
            if (TransactionModel) {
                transaction = await TransactionModel.create({
                    transactionId: data.transactionId,
                    aadhaarNumber: data.aadhaarNumber,
                    maskedAadhaar: this.maskAadhaar(data.aadhaarNumber),
                    partnerId: data.partnerId,
                    userId: data.userId,
                    status: data.status,
                    mobile: data.mobile,
                    isMock: data.isMock || false,
                    otpSentAt: new Date()
                });
                logger.info(`Transaction stored in TransactionModel: ${transaction._id}`);
            }

            // Also store in Partner if partnerId is available
            if (data.partnerId) {
                await Partner.findByIdAndUpdate(
                    data.partnerId,
                    {
                        $set: {
                            'kyc.transactionId': data.transactionId,
                            'kyc.status': 'otp_sent',
                            'kyc.otpSentAt': new Date(),
                            'verificationStatus': 'in_progress',
                            'kycLastAttempted': new Date()
                        }
                    },
                    { new: true }
                );
                logger.info(`Transaction reference stored in Partner: ${data.partnerId}`);
            }

            return transaction || { success: true };
        } catch (error) {
            logger.error('Error storing transaction:', error.message);
            // Don't throw - just return error for graceful handling
            return { success: false, error: error.message };
        }
    }

    /**
     * Store KYC data in database
     */
    async storeKYCData(kycData, transactionId, partnerId = null) {
        try {
            logger.info(`[STORE KYC] Transaction: ${transactionId}, Name: ${kycData.name}`);
            
            // If partnerId not provided, find it from transaction
            if (!partnerId) {
                const partner = await this.findPartnerByTransactionId(transactionId);
                if (!partner) {
                    throw new Error(`No partner found for transaction: ${transactionId}`);
                }
                partnerId = partner._id;
            }

            // Prepare KYC update object
            const kycUpdate = {
                'kyc.type': 'Aadhar',
                'kyc.fullName': kycData.name,
                'kyc.dob': kycData.dateOfBirth,
                'kyc.gender': kycData.gender,
                'kyc.fatherName': kycData.address?.careOf,
                'kyc.address': kycData.address?.full,
                'kyc.photo': kycData.photo,
                'kyc.aadhaarMasked': this.maskAadhaar(kycData.aadhaarNumber),
                'kyc.aadhaarLast4': kycData.aadhaarNumber?.substring(8),
                'kyc.status': 'verified',
                'kyc.verified': true,
                'kyc.verifiedAt': new Date(),
                'kyc.digioReferenceId': kycData.digioReferenceId || `MOCK_REF_${Date.now()}`,
                'isVerified': true,
                'verificationStatus': 'verified',
                'kycLastAttempted': new Date()
            };

            // Add encrypted data only if ENCRYPTION_KEY is set
            if (process.env.ENCRYPTION_KEY) {
                kycUpdate['kyc.encryptedData'] = this.encryptSensitiveData(kycData);
            }

            // Update partner with KYC data
            const updatedPartner = await Partner.findByIdAndUpdate(
                partnerId,
                { $set: kycUpdate },
                { new: true, runValidators: true }
            );

            if (!updatedPartner) {
                throw new Error(`Failed to update partner: ${partnerId}`);
            }

            logger.info(`KYC stored for partner: ${updatedPartner._id}, Garage ID: ${updatedPartner.garageId}`);

            return {
                success: true,
                partnerId: updatedPartner._id,
                garageId: updatedPartner.garageId,
                aadhaarMasked: kycUpdate['kyc.aadhaarMasked']
            };

        } catch (error) {
            logger.error('Error storing KYC data:', error.message, error.stack);
            throw error;
        }
    }

    /**
     * Update transaction status
     */
    async updateTransaction(partnerId, transactionId, updates) {
        try {
            logger.info(`[UPDATE TXN] ${transactionId} - Status: ${updates.status}`);
            
            const kycUpdate = {
                'kyc.transactionId': transactionId,
                'verificationStatus': 'in_progress'
            };

            // Set status-specific fields
            if (updates.status === 'VERIFIED' || updates.status === 'verified') {
                kycUpdate['kyc.status'] = 'verified';
                kycUpdate['kyc.verifiedAt'] = updates.verifiedAt || new Date();
                kycUpdate['kyc.digioReferenceId'] = updates.digioReferenceId;
                kycUpdate['verificationStatus'] = 'verified';
                kycUpdate['isVerified'] = true;
                kycUpdate['kyc.verified'] = true;
            } else if (updates.status === 'FAILED' || updates.status === 'failed') {
                kycUpdate['kyc.status'] = 'failed';
                kycUpdate['kyc.failedAt'] = updates.failedAt || new Date();
                kycUpdate['kyc.lastError'] = {
                    code: updates.errorCode,
                    message: updates.error,
                    occurredAt: new Date()
                };
                kycUpdate['verificationStatus'] = 'rejected';
            } else {
                kycUpdate['kyc.status'] = updates.status || 'otp_sent';
            }

            // Update partner
            const partner = await Partner.findByIdAndUpdate(
                partnerId,
                { $set: kycUpdate },
                { new: true, runValidators: true }
            );

            if (!partner) {
                throw new Error(`Partner with ID ${partnerId} not found`);
            }

            // Also update TransactionModel if available
            if (TransactionModel) {
                await TransactionModel.findOneAndUpdate(
                    { transactionId },
                    { $set: updates },
                    { new: true }
                );
            }

            logger.info(`Transaction updated: ${transactionId}, Status: ${updates.status}`);
            return partner;
        } catch (error) {
            logger.error('Error updating transaction:', error.message);
            // Don't throw - return error for graceful handling
            return { success: false, error: error.message };
        }
    }

    /**
     * Helper to find partner by transactionId
     */
    async findPartnerByTransactionId(transactionId) {
        try {
            // First check TransactionModel
            if (TransactionModel) {
                const transaction = await TransactionModel.findOne({
                    transactionId,
                    status: { $in: ['OTP_SENT', 'VERIFIED', 'FAILED'] }
                });
                if (transaction && transaction.partnerId) {
                    const partner = await Partner.findById(transaction.partnerId);
                    if (partner) return partner;
                }
            }

            // Fallback: Check Partner directly
            const partner = await Partner.findOne({
                'kyc.transactionId': transactionId
            });

            return partner;
        } catch (error) {
            logger.error('Error finding partner by transactionId:', error.message);
            return null;
        }
    }

    /**
     * Helper method to encrypt sensitive data
     */
    encryptSensitiveData(kycData) {
        try {
            const algorithm = 'aes-256-gcm';
            const key = Buffer.from(process.env.ENCRYPTION_KEY ||
                crypto.createHash('sha256').update('your-fallback-key').digest());

            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(algorithm, key, iv);

            const sensitiveFields = {
                aadhaarNumber: kycData.aadhaarNumber,
                mobile: kycData.contact?.mobile,
                email: kycData.contact?.email,
                fullAddress: kycData.address?.full,
                rawPhoto: kycData.photo
            };

            let encrypted = cipher.update(JSON.stringify(sensitiveFields), 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag().toString('hex');

            return {
                iv: iv.toString('hex'),
                encryptedData: encrypted,
                authTag: authTag,
                algorithm: algorithm,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            logger.error('Encryption failed:', error);
            return null; // Return null instead of throwing
        }
    }

    /**
     * Remove sensitive data from KYC response
     */
    sanitizeKYCData(kycData) {
        const sanitized = { ...kycData };

        // Mask Aadhaar number
        if (sanitized.aadhaarNumber) {
            sanitized.aadhaarMasked = `${sanitized.aadhaarNumber.substring(0, 4)}XXXX${sanitized.aadhaarNumber.substring(8)}`;
            delete sanitized.aadhaarNumber;
        }

        // Remove full address if not needed
        if (sanitized.address && sanitized.address.full) {
            delete sanitized.address.full;
        }

        return sanitized;
    }

    /**
     * Mask Aadhaar number
     */
    maskAadhaar(aadhaar) {
        if (!aadhaar || aadhaar.length !== 12) return '';
        return `${aadhaar.substring(0, 4)}XXXX${aadhaar.substring(8)}`;
    }
}

module.exports = new AadhaarController();