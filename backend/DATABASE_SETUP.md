# Database Setup Guide for W-Store

## 🚨 **Database Connection Issue Fixed!**

The error you encountered:
```
Access denied for user 'root'@'localhost' (using password: NO)
```

This happens because the database credentials are not configured. Here's how to fix it:

## 🔧 **Quick Fix Options**

### Option 1: Interactive Setup (Recommended)
```bash
cd backend
npm run setup
```
This will guide you through creating a `.env` file with your database credentials.

### Option 2: Manual Setup
Create a `.env` file in the `backend` directory with:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=wstore_db
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=info
```

### Option 3: Environment Variables
Set them directly in your terminal:
```bash
# Windows PowerShell
$env:DB_HOST="localhost"
$env:DB_USER="root"
$env:DB_PASSWORD="your_password"
$env:DB_NAME="wstore_db"
$env:DB_PORT="3306"

# Windows Command Prompt
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=your_password
set DB_NAME=wstore_db
set DB_PORT=3306

# Linux/Mac
export DB_HOST=localhost
export DB_USER=root
export DB_PASSWORD=your_password
export DB_NAME=wstore_db
export DB_PORT=3306
```

## 🗄️ **MySQL Requirements**

### 1. **MySQL Service Running**
Make sure MySQL is installed and running:
```bash
# Windows (if using XAMPP/WAMP)
# Start MySQL service from control panel

# Linux
sudo systemctl status mysql
sudo systemctl start mysql

# Mac
brew services list | grep mysql
brew services start mysql
```

### 2. **Database User Permissions**
Your MySQL user needs these permissions:
```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS wstore_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Grant permissions to your user
GRANT ALL PRIVILEGES ON wstore_db.* TO 'root'@'localhost';
FLUSH PRIVILEGES;

-- Or create a new user
CREATE USER 'wstore_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON wstore_db.* TO 'wstore_user'@'localhost';
FLUSH PRIVILEGES;
```

### 3. **Test Connection**
Test your MySQL connection:
```bash
mysql -u root -p -h localhost -P 3306
```

## 🚀 **Complete Setup Process**

### Step 1: Setup Database Configuration
```bash
cd backend
npm run setup
```

### Step 2: Run Migration
```bash
npm run migrate:admin-overrides
```

### Step 3: Test the System
```bash
npm run test:admin-overrides
```

### Step 4: Start the Server
```bash
npm run dev
```

## 🔍 **Troubleshooting**

### **Common Issues & Solutions**

#### 1. **Access Denied Error**
```
ER_ACCESS_DENIED_ERROR: Access denied for user 'root'@'localhost'
```
**Solution:**
- Check if MySQL is running
- Verify username/password
- Ensure user has proper permissions

#### 2. **Connection Refused**
```
ECONNREFUSED: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution:**
- Start MySQL service
- Check if port 3306 is correct
- Verify firewall settings

#### 3. **Database Doesn't Exist**
```
ER_BAD_DB_ERROR: Unknown database 'wstore_db'
```
**Solution:**
- Create the database manually
- Or let the migration script create it

#### 4. **Permission Denied**
```
ER_DBACCESS_DENIED_ERROR: Access denied for user
```
**Solution:**
- Grant proper permissions to your user
- Check if user can access the database

### **Debug Steps**

1. **Check MySQL Status**
   ```bash
   # Windows
   net start | findstr MySQL
   
   # Linux/Mac
   sudo systemctl status mysql
   ```

2. **Test MySQL Connection**
   ```bash
   mysql -u root -p
   ```

3. **Check Database**
   ```sql
   SHOW DATABASES;
   USE wstore_db;
   SHOW TABLES;
   ```

4. **Check User Permissions**
   ```sql
   SHOW GRANTS FOR 'root'@'localhost';
   ```

## 📋 **Environment Variables Reference**

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL server hostname |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | `` | MySQL password |
| `DB_NAME` | `wstore_db` | Database name |
| `DB_PORT` | `3306` | MySQL port |
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |
| `JWT_SECRET` | `your-super-secret-jwt-key` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration time |
| `LOG_LEVEL` | `info` | Logging level |

## 🎯 **What the Admin Overrides System Does**

Once the database is set up, the system will:

1. **Create the `admin_overrides` table** with proper schema
2. **Support all 7 required metrics:**
   - `orders_sold` - Orders sold count
   - `total_sales` - Total sales amount
   - `profit_forecast` - Profit projections
   - `visitors` - Shop visitors
   - `shop_followers` - Shop followers
   - `shop_rating` - Shop rating (0-5)
   - `credit_score` - Credit score (300-850)

3. **Provide API endpoints** for CRUD operations
4. **Enable frontend editing** of seller metrics
5. **Store changes permanently** in the database

## 🆘 **Still Having Issues?**

If you're still experiencing problems:

1. **Check the logs** for detailed error messages
2. **Verify MySQL installation** and service status
3. **Test basic MySQL connectivity** outside the application
4. **Check user permissions** and database access
5. **Ensure no firewall** is blocking port 3306

## 📞 **Support**

For additional help:
- Check the main `ADMIN_OVERRIDES_COMPLETE.md` file
- Review the backend logs in the `logs/` directory
- Verify your MySQL version and configuration

---

**Remember:** The database connection must be working before you can run migrations or tests. Once configured, the admin overrides system will work seamlessly!
