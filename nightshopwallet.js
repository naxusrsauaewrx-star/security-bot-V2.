const cloudscraper = require('cloudscraper');
const fs = require('fs').promises;
const path = require('path');

class TopupSystem {
    constructor(config = {}) {
        this.phoneNumber = config.phoneNumber || '';
        this.databasePath = config.databasePath || './nightshop/user_money.json';
        this.timeout = config.timeout || 30000;
        this.maxRetries = 2; 
    }

    validateGiftLink(link) {
        if (!link || typeof link !== 'string') {
            return false;
        }
        const cleanLink = link.trim().replace(/\s/g, '');
        const regex = /^https:\/\/gift\.truemoney\.com\/campaign(\/)?\?v=[a-zA-Z0-9]+$/;
        return regex.test(cleanLink);
    }

    extractVoucherCode(link) {
        try {
            const url = new URL(link);
            return url.searchParams.get('v');
        } catch (error) {
            return null;
        }
    }

    async redeemVoucher(giftLink) {
        let attempts = 0;

        while (attempts < this.maxRetries) {
            try {
                if (!this.validateGiftLink(giftLink)) {
                    return {
                        success: false,
                        error: 'INVALID_LINK_FORMAT',
                        message: 'รูปแบบลิงค์อั่งเปาไม่ถูกต้อง'
                    };
                }

                const voucherCode = this.extractVoucherCode(giftLink);
                if (!voucherCode) {
                    return {
                        success: false,
                        error: 'INVALID_VOUCHER_CODE',
                        message: 'ไม่สามารถดึงรหัสบัตรกำนัลได้'
                    };
                }

                const requestData = {
                    mobile: this.phoneNumber,
                    voucher_hash: voucherCode
                };


                await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

                const response = await cloudscraper.post(
                    `https://gift.truemoney.com/campaign/vouchers/${voucherCode}/redeem`,
                    {
                        json: requestData,
                        timeout: this.timeout,
                        headers: {
                            'Referer': `https://gift.truemoney.com/campaign/?v=${voucherCode}`,
                            'Origin': 'https://gift.truemoney.com',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
                        }
                    }
                );

                let redeemData = response;
                if (typeof response === 'string') {
                    try {
                        redeemData = JSON.parse(response);
                    } catch (e) { }
                }

                if (redeemData?.status?.code === 'SUCCESS') {
                    const amount = parseFloat(redeemData.data.my_ticket.amount_baht);
                    const ownerName = redeemData.data.owner_profile.full_name;

                    return {
                        success: true,
                        amount: amount,
                        ownerName: ownerName,
                        voucherCode: voucherCode
                    };
                } else {
                    const errorCode = redeemData?.status?.code;
                    if (errorCode === 'VOUCHER_OUT_OF_STOCK' || errorCode === 'VOUCHER_NOT_FOUND') {
                        return {
                            success: false,
                            error: errorCode,
                            message: 'ซองอั่งเปานี้ถูกใช้งานไปแล้ว'
                        };
                    }

                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 2000)); 
                }

            } catch (error) {
                const statusCode = error.response?.statusCode;
                const errorBody = error.response?.body;


                if (statusCode === 400 && errorBody) {
                    try {
                        const data = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
                        if (data.status?.code === 'VOUCHER_OUT_OF_STOCK' || data.status?.code === 'VOUCHER_NOT_FOUND') {
                            return {
                                success: false,
                                error: 'VOUCHER_OUT_OF_STOCK',
                                message: 'ซองอั่งเปานี้ถูกใช้งานไปแล้ว'
                            };
                        }
                    } catch (e) { }
                }

    
                if (statusCode === 429 || statusCode === 403 || error.code === 'ETIMEDOUT') {
                    attempts++;
                    if (attempts < this.maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 3000)); // ชะลอนานขึ้นเมื่อติดขัด
                        continue;
                    }
                }

                return {
                    success: false,
                    error: 'HTTP_ERROR',
                    message: `เกิดข้อผิดพลาด HTTP: ${statusCode || error.message}`
                };
            }
        }
    }

    async loadAccountData() {
        try {
            const dir = path.dirname(this.databasePath);
            await fs.mkdir(dir, { recursive: true });
            const data = await fs.readFile(this.databasePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return {};
            throw error;
        }
    }

    async saveAccountData(accountData) {
        try {
            const dir = path.dirname(this.databasePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.databasePath, JSON.stringify(accountData, null, 4), 'utf8');
        } catch (error) {
            throw error;
        }
    }

    async addPointsToUser(userId, amount) {
        try {
            const accountData = await this.loadAccountData();
            if (!accountData[userId]) {
                accountData[userId] = { point: 0, pointall: 0 };
            }
            accountData[userId].point += amount;
            accountData[userId].pointall += amount;
            await this.saveAccountData(accountData);
            return accountData[userId];
        } catch (error) {
            throw error;
        }
    }

    async deductPointsFromUser(userId, amount) {
        try {
            const accountData = await this.loadAccountData();
            if (!accountData[userId]) {
                throw new Error('ไม่พบข้อมูลผู้ใช้');
            }
            
            if (accountData[userId].point < amount) {
                throw new Error('ยอดเงินไม่เพียงพอ');
            }
            
            accountData[userId].point -= amount;
            await this.saveAccountData(accountData);
            return accountData[userId];
        } catch (error) {
            throw error;
        }
    }

    async processTopup(userId, giftLink) {
        try {
            const redeemResult = await this.redeemVoucher(giftLink);
            if (!redeemResult.success) return redeemResult;

            const userData = await this.addPointsToUser(userId, redeemResult.amount);
            return {
                success: true,
                amount: redeemResult.amount,
                ownerName: redeemResult.ownerName,
                userPoints: userData.point
            };
        } catch (error) {
            return {
                success: false,
                error: 'TRANSACTION_ERROR',
                message: `เกิดข้อผิดพลาด: ${error.message}`
            };
        }
    }
}

module.exports = TopupSystem;