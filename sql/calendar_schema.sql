-- Calendar Events Table
-- This table stores all calendar events with comprehensive field structure
-- You can easily replace this SQL with your own database implementation

CREATE TABLE calendar_events (
  -- Primary key
  CE_ID INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Event details
  CE_TITLE VARCHAR(255) NOT NULL,
  CE_DESCRIPTION TEXT,
  
  -- Date and time fields
  CE_START_DATE DATE NOT NULL,
  CE_END_DATE DATE NOT NULL,
  CE_START_TIME TIME NULL,
  CE_END_TIME TIME NULL,
  CE_IS_ALL_DAY TINYINT(1) DEFAULT 0,
  
  -- Recurrence and location
  CE_RECURRENCE ENUM('none', 'daily', 'weekly', 'monthly', 'yearly') DEFAULT 'none',
  CE_LOCATION VARCHAR(500),
  
  -- Attendees (stored as JSON array of user IDs)
  CE_ATTENDEES JSON,
  
  -- Event categorization
  CE_CATEGORY ENUM('general', 'meeting', 'task', 'event', 'reminder', 'appointment') DEFAULT 'general',
  CE_PRIORITY ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  CE_STATUS ENUM('confirmed', 'pending', 'cancelled', 'completed', 'deleted') DEFAULT 'confirmed',
  
  -- Audit fields (following your existing pattern)
  CR_OID VARCHAR(50) NOT NULL COMMENT 'Created by Organization ID',
  CR_UID VARCHAR(50) NOT NULL COMMENT 'Created by User ID',
  CR_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Created Date',
  UPDATE_OID VARCHAR(50) COMMENT 'Updated by Organization ID',
  UPDATE_UID VARCHAR(50) COMMENT 'Updated by User ID',
  UPDATE_DATE TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Updated Date',
  
  -- Indexes for performance
  INDEX idx_start_date (CE_START_DATE),
  INDEX idx_end_date (CE_END_DATE),
  INDEX idx_date_range (CE_START_DATE, CE_END_DATE),
  INDEX idx_creator (CR_UID),
  INDEX idx_category (CE_CATEGORY),
  INDEX idx_status (CE_STATUS),
  INDEX idx_created_date (CR_DATE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample data for testing
INSERT INTO calendar_events (
  CE_TITLE, CE_DESCRIPTION, CE_START_DATE, CE_END_DATE, 
  CE_START_TIME, CE_END_TIME, CE_IS_ALL_DAY, CE_CATEGORY,
  CE_PRIORITY, CE_STATUS, CR_OID, CR_UID
) VALUES 
(
  'Team Meeting', 
  'Weekly team sync meeting to discuss project progress',
  '2024-02-01', '2024-02-01',
  '09:00', '10:30', 0, 'meeting',
  'high', 'confirmed', 'ORG001', 'USR001'
),
(
  'Project Deadline',
  'Final deadline for Q1 project deliverables',
  '2024-02-15', '2024-02-15',
  NULL, NULL, 1, 'task',
  'urgent', 'confirmed', 'ORG001', 'USR001'
),
(
  'Company Event',
  'Annual company retreat and team building activities',
  '2024-02-20', '2024-02-22',
  NULL, NULL, 1, 'event',
  'medium', 'confirmed', 'ORG001', 'USR001'
);

-- Optional: Create a view for easy querying
CREATE VIEW calendar_events_view AS
SELECT 
  CE_ID as id,
  CE_TITLE as title,
  CE_DESCRIPTION as description,
  CE_START_DATE as startDate,
  CE_END_DATE as endDate,
  CE_START_TIME as startTime,
  CE_END_TIME as endTime,
  CE_IS_ALL_DAY as isAllDay,
  CE_RECURRENCE as recurrence,
  CE_LOCATION as location,
  CE_ATTENDEES as attendees,
  CE_CATEGORY as category,
  CE_PRIORITY as priority,
  CE_STATUS as status,
  CR_UID as createdBy,
  CR_DATE as createdDate,
  UPDATE_DATE as updatedDate
FROM calendar_events
WHERE CE_STATUS != 'deleted';

-- Performance optimization queries (run after data population)
-- ANALYZE TABLE calendar_events;
-- OPTIMIZE TABLE calendar_events;