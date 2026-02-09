
// In-memory mock database
// Admin password is 'admin123' - pre-hashed using bcrypt with 10 rounds
const db = {
    users: [
        {
            id: 1,
            email: 'admin@freip.com',
            // Hash of 'admin123' - generated with bcrypt.hash('admin123', 10)
            password_hash: '$2a$10$MFQBz/crmlMGVSmTUeEIIuruiyCe2k4TXxJkJEGopFGIt8aGkzUsO',
            first_name: 'System',
            last_name: 'Admin',
            phone: '+92300000000',
            role_id: 'admin',
            kyc_status: 'verified',
            kyc_level: 3,
            wallet_balance: 0,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
        }
    ],
    properties: [
        {
            id: 1,
            seller_id: 1,
            title: 'Premium Apartment in Islamabad',
            description: 'Luxury apartment with city view',
            location: 'Blue Area, Islamabad',
            address: 'Plot 12, Blue Area',
            city: 'Islamabad',
            property_type: 'Residential',
            area_sqft: 1500,
            total_value: 25000000,
            funding_target: 25000000,
            min_investment: 50000,
            max_investment: 5000000,
            expected_returns_annual: 12.5,
            rental_yield: 5.5,
            status: 'active',
            funding_raised: 12500000,
            created_at: new Date()
        }
    ],
    investments: [],
    transactions: [],
    dividends: []
};

let userCounter = 1;
let propertyCounter = 2; // Started at 2
let investmentCounter = 1;
let transactionCounter = 1;

export const mockQuery = async (text, params) => {
    console.log('📝 [MOCK DB] Executing Query:', text);
    console.log('   [MOCK DB] Params:', params);

    const normalized = text.trim().replace(/\s+/g, ' ').toUpperCase();

    // ------------------------------------------------------------------
    // USER QUERIES
    // ------------------------------------------------------------------

    // Login query: SELECT with specific columns including password_hash
    if (normalized.includes('FROM USERS WHERE EMAIL') && normalized.includes('PASSWORD_HASH')) {
        const user = db.users.find(u => u.email === params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // findByEmail: SELECT * FROM users WHERE email = $1
    if (normalized.includes('SELECT * FROM USERS WHERE EMAIL = $1')) {
        const user = db.users.find(u => u.email === params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // findById: SELECT * FROM users WHERE id = $1
    if (normalized.includes('SELECT * FROM USERS WHERE ID = $1')) {
        const user = db.users.find(u => u.id == params[0]);
        return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // create: INSERT INTO users ... RETURNING ...
    if (normalized.includes('INSERT INTO USERS')) {
        const newUser = {
            id: userCounter++,
            email: params[0],
            phone: params[1],
            password_hash: params[2],
            first_name: params[3],
            last_name: params[4],
            role_id: params[5],
            kyc_status: 'pending',
            wallet_balance: 0,
            kyc_level: 1,
            created_at: new Date(),
            updated_at: new Date()
        };
        db.users.push(newUser);
        return { rows: [newUser], rowCount: 1 };
    }

    // update: UPDATE users SET ... WHERE id = $1
    if (normalized.includes('UPDATE USERS')) {
        // This is complex regex matching, simplified for demo:
        // Update the user with id = params[0]
        const userIndex = db.users.findIndex(u => u.id == params[0]);
        if (userIndex !== -1) {
            // Just merge checks for demo logic
            // params: [id, first_name, last_name, kyc_status, kyc_level, wallet_balance]
            const u = db.users[userIndex];
            u.first_name = params[1] || u.first_name;
            u.last_name = params[2] || u.last_name;
            u.kyc_status = params[3] || u.kyc_status;
            u.kyc_level = params[4] || u.kyc_level;
            u.wallet_balance = params[5] || u.wallet_balance;
            u.updated_at = new Date();
            return { rows: [u], rowCount: 1 };
        }
    }

    // ------------------------------------------------------------------
    // PROPERTY QUERIES
    // ------------------------------------------------------------------

    // findAll: SELECT * FROM properties WHERE 1=1 ... (ignoring filters for demo precision)
    if (normalized.includes('SELECT * FROM PROPERTIES WHERE 1=1')) {
        return { rows: db.properties, rowCount: db.properties.length };
    }

    // findById: SELECT * FROM properties WHERE id = $1
    if (normalized.includes('SELECT * FROM PROPERTIES WHERE ID = $1')) {
        const prop = db.properties.find(p => p.id == params[0]);
        return { rows: prop ? [prop] : [], rowCount: prop ? 1 : 0 };
    }

    // create property
    if (normalized.includes('INSERT INTO PROPERTIES')) {
        // simplified
        const newProp = {
            id: propertyCounter++,
            seller_id: params[0],
            title: params[1],
            description: params[2],
            location: params[3],
            address: params[4],
            city: params[5],
            property_type: params[6],
            area_sqft: params[7],
            total_value: params[8],
            funding_target: params[9],
            min_investment: params[10],
            max_investment: params[11],
            expected_returns_annual: params[12],
            rental_yield: params[13],
            status: 'active',
            funding_raised: 0,
            created_at: new Date(),
            updated_at: new Date()
        };
        db.properties.push(newProp);
        return { rows: [newProp], rowCount: 1 };
    }


    // Default
    console.log('⚠️ [MOCK DB] Unhandled Query:', text);
    return { rows: [], rowCount: 0 };
};
