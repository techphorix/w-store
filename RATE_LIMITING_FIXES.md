# Rate Limiting and Authentication Fixes

## Issues Identified

1. **429 Too Many Requests on `/api/auth/refresh`**: Frontend was hitting rate limits due to excessive refresh token requests
2. **401 Unauthorized on `/api/analytics/seller/dashboard`**: Authentication failures due to expired tokens and refresh loops

## Root Causes

1. **Strict Rate Limiting**: Auth endpoints had a 50 requests per 15 minutes limit
2. **Token Refresh Loops**: Frontend interceptor could create infinite loops when refresh failed
3. **Excessive API Calls**: SellerDataContext was making multiple API calls in quick succession
4. **Real-time Updates**: 60-second intervals were too aggressive and causing rate limiting

## Fixes Implemented

### Backend Changes

#### 1. Enhanced Rate Limiting (`backend/config/rateLimit.js`)
- **General Auth**: Increased from 50 to 100 requests per 15 minutes
- **Refresh Endpoint**: Added specific rate limiter with 200 requests per 15 minutes
- **Better Key Generation**: Uses IP + User ID for refresh endpoints

#### 2. Improved Auth Routes (`backend/routes/auth.js`)
- **Better Error Handling**: Added specific handling for rate limiting errors
- **Retry After Headers**: Proper retry-after information for 429 responses

#### 3. Server Configuration (`backend/server.js`)
- **Specific Rate Limiting**: Applied refresh rate limiter specifically to refresh endpoint
- **Better Route Organization**: Separated rate limiting concerns

### Frontend Changes

#### 1. Enhanced API Service (`frontend/src/services/api.ts`)
- **Loop Prevention**: Added `_isRefreshRequest` flag to prevent infinite refresh loops
- **Rate Limit Handling**: Better handling of 429 errors with retry logic
- **Authentication Checks**: Skip requests if user is not authenticated
- **Retry Mechanism**: Added retry logic for failed requests

#### 2. Optimized SellerDataContext (`frontend/src/contexts/SellerDataContext.tsx`)
- **Reduced API Calls**: Increased intervals from 60s to 120s (2 minutes)
- **Debounced Refresh**: Added 2-second debounce to prevent rapid successive calls
- **Safe Refresh**: Added rate limit-aware refresh function
- **Better Error Handling**: Graceful handling of rate limit errors
- **Adaptive Intervals**: Extends intervals when rate limited

## Key Improvements

1. **Prevents Infinite Loops**: Token refresh interceptor now prevents infinite loops
2. **Reduces Rate Limiting**: More lenient limits and better request spacing
3. **Better Error Recovery**: Graceful handling of rate limit errors with retry logic
4. **Optimized Timing**: Reduced frequency of real-time updates and API calls
5. **Authentication Validation**: Prevents unnecessary requests when not authenticated

## Configuration

### Environment Variables
```bash
# Rate limiting configuration
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes in milliseconds
RATE_LIMIT_AUTH_MAX=100              # General auth requests per window
RATE_LIMIT_REFRESH_MAX=200           # Refresh requests per window
RATE_LIMIT_GENERAL_MAX=200           # General API requests per window
```

### Frontend Settings
- **Real-time Updates**: Every 2 minutes (was 1 minute)
- **Initial Data Fetch**: 1 second delay (was 100ms)
- **Refresh Debounce**: 2 seconds
- **Retry Attempts**: 2 attempts with exponential backoff

## Testing

To test the fixes:

1. **Start the backend server**
2. **Login to the application**
3. **Monitor the console for rate limiting messages**
4. **Check that real-time updates work without hitting limits**
5. **Verify token refresh works without loops**

## Monitoring

The system now provides better logging for:
- Rate limit exceeded events
- Token refresh attempts and failures
- API call frequency and timing
- Authentication status changes

## Future Improvements

1. **Adaptive Rate Limiting**: Adjust limits based on user behavior
2. **Circuit Breaker Pattern**: Temporarily disable endpoints on repeated failures
3. **Request Queuing**: Queue requests when rate limited instead of failing
4. **User-specific Limits**: Different limits for different user types
