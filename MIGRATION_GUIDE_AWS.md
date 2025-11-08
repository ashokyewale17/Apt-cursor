# Running Employee ID Migration on AWS EC2

## Prerequisites

1. **SSH access to your EC2 instance**
2. **Node.js installed on EC2** (if not already installed)
3. **MongoDB connection** (either on EC2 or MongoDB Atlas)
4. **Project deployed on EC2**

## Step-by-Step Instructions

### Step 1: SSH into your EC2 Instance

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip-address
```

Or if using Ubuntu:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

### Step 2: Navigate to Your Project Directory

```bash
cd /path/to/your/project
# Example: cd /home/ec2-user/apt-cursor
# Or: cd /var/www/apt-cursor
```

### Step 3: Check MongoDB Connection

**If using MongoDB Atlas (Cloud):**
- Make sure your `.env` file has the correct `MONGODB_URI`
- The script will automatically use it

**If MongoDB is on EC2:**
- Check if MongoDB service is running:
  ```bash
  sudo systemctl status mongod
  ```
- If not running, start it:
  ```bash
  sudo systemctl start mongod
  ```

### Step 4: Install Dependencies (if needed)

```bash
# Install server dependencies
cd server
npm install
```

### Step 5: Set Environment Variables (if needed)

Make sure your `.env` file exists in the `server` directory:

```bash
cd server
nano .env
```

Ensure it contains:
```
MONGODB_URI=your_mongodb_connection_string
```

### Step 6: Run the Migration Script

From the project root directory:

```bash
node server/scripts/migrateEmployeeIds.js
```

Or from the server directory:

```bash
cd server
node scripts/migrateEmployeeIds.js
```

### Step 7: Verify the Migration

The script will output:
- Number of employees found without IDs
- Each employee ID assigned
- Confirmation message when complete

## Alternative: Run via PM2 (if using PM2)

If you're using PM2 to manage your Node.js processes:

```bash
pm2 exec node server/scripts/migrateEmployeeIds.js
```

## Using Screen or Tmux (Recommended for Long Operations)

To prevent the script from stopping if your SSH connection drops:

### Using Screen:
```bash
screen -S migration
node server/scripts/migrateEmployeeIds.js
# Press Ctrl+A then D to detach
# Reattach later with: screen -r migration
```

### Using Tmux:
```bash
tmux new -s migration
node server/scripts/migrateEmployeeIds.js
# Press Ctrl+B then D to detach
# Reattach later with: tmux attach -t migration
```

## Important Considerations

### 1. **Backup Your Database First**
Before running the migration, create a backup:

```bash
# If MongoDB is on EC2
mongodump --out /backup/before-migration-$(date +%Y%m%d)

# Or use MongoDB Atlas backup feature
```

### 2. **Run During Low Traffic**
- Run the migration during off-peak hours
- Or temporarily disable new employee creation

### 3. **Monitor the Process**
- Watch the output to ensure it completes successfully
- Check for any errors

### 4. **Verify After Migration**
After migration completes, verify in your application:
- Check employee profiles show correct IDs (EMP001, EMP002, etc.)
- Verify new employees get sequential IDs

## Troubleshooting

### Issue: "Cannot find module"
**Solution:**
```bash
cd server
npm install
```

### Issue: MongoDB Connection Error
**Solution:**
- Check MongoDB is running: `sudo systemctl status mongod`
- Verify `.env` file has correct `MONGODB_URI`
- Check security groups (if using MongoDB Atlas, ensure EC2 IP is whitelisted)

### Issue: Permission Denied
**Solution:**
```bash
chmod +x server/scripts/migrateEmployeeIds.js
```

### Issue: Script Hangs
**Solution:**
- Check MongoDB connection
- Verify network connectivity
- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`

## Production Best Practices

1. **Test First**: Run on a staging environment before production
2. **Backup**: Always backup before running migrations
3. **Monitor**: Watch the script output and logs
4. **Rollback Plan**: Keep the backup ready in case you need to rollback
5. **Document**: Note the date/time and results of the migration

## Example Complete Workflow

```bash
# 1. SSH into EC2
ssh -i key.pem ec2-user@your-ec2-ip

# 2. Navigate to project
cd /home/ec2-user/apt-cursor

# 3. Create backup (if MongoDB on EC2)
mongodump --out /tmp/backup-$(date +%Y%m%d-%H%M%S)

# 4. Start screen session
screen -S migration

# 5. Run migration
node server/scripts/migrateEmployeeIds.js

# 6. Detach from screen (Ctrl+A, then D)
# 7. Check results later
screen -r migration
```

## Post-Migration

After successful migration:
1. ✅ All existing employees have sequential IDs
2. ✅ New employees automatically get IDs
3. ✅ Employee profiles display correct IDs
4. ✅ No duplicate IDs

The migration is a one-time operation. After it completes, the system will automatically assign IDs to new employees.

