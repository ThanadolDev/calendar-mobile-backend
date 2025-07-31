-- ============================================================================
-- Calendar SQL Queries for Holiday/Non-Work Day Integration
-- ============================================================================
-- This file contains SQL queries for calendar data retrieval with holiday logic
-- All queries are designed to work with Oracle Database (KPDBA schema)

-- Query 1: Get Non-Work Days with Holiday Classification
-- ============================================================================
-- SQL_NO: 1001
-- Purpose: Retrieve non-work days and holidays for calendar display
-- Parameters: :as_yyyy (year), :as_start_date, :as_end_date
SELECT 
    NW.NON_WORK_DATE,
    TO_CHAR(NW.NON_WORK_DATE, 'DD/MM/YYYY') as FORMATTED_DATE,
    TO_CHAR(NW.NON_WORK_DATE, 'DAY') as DAY_NAME,
    NVL(NW.NON_WORK_DESC, 'Holiday') as DESCRIPTION,
    CASE 
        WHEN UPPER(NW.NON_WORK_DESC) LIKE '%HOLIDAY%' THEN 'HOLIDAY'
        WHEN UPPER(NW.NON_WORK_DESC) LIKE '%WEEKEND%' THEN 'WEEKEND'
        ELSE 'NON_WORK'
    END as CATEGORY,
    -- Check if it's a recurring holiday (same month/day different years)
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM KPDBA.NON_WORK NW2 
            WHERE TO_CHAR(NW2.NON_WORK_DATE, 'MM-DD') = TO_CHAR(NW.NON_WORK_DATE, 'MM-DD')
            AND TO_CHAR(NW2.NON_WORK_DATE, 'YYYY') != TO_CHAR(NW.NON_WORK_DATE, 'YYYY')
        ) THEN 'Y' 
        ELSE 'N' 
    END as IS_RECURRING
FROM KPDBA.NON_WORK NW
WHERE TO_NUMBER(TO_CHAR(NW.NON_WORK_DATE, 'YYYY')) BETWEEN :as_yyyy - 1 AND :as_yyyy + 1
AND NW.NON_WORK_DATE BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                         AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
ORDER BY NW.NON_WORK_DATE;

-- Query 2: Get Employee Leave Events for Calendar
-- ============================================================================
-- SQL_NO: 1002  
-- Purpose: Retrieve employee leave events for calendar display
-- Parameters: :as_yyyy, :as_start_date, :as_end_date, :as_emp_id (optional)
SELECT 
    LV.LEAVE_ID,
    LV.EMP_ID,
    E.EMP_FNAME || ' ' || E.EMP_LNAME as EMPLOYEE_NAME,
    LV.START_DATE,
    LV.END_DATE,
    LVD.LEAVE_DATE,
    LVD.QTY as DURATION,
    TO_CHAR(LVD.START_TIME, 'HH24:MI') as START_TIME,
    TO_CHAR(LVD.END_TIME, 'HH24:MI') as END_TIME,
    LMT.L_TYPE_GRP_DESC as LEAVE_TYPE,
    LVD.L_TYPE_GRP,
    CASE LVD.DOCUMENT_FLAG 
        WHEN 'T' THEN 'With Medical Certificate'
        WHEN 'F' THEN 'Without Medical Certificate'
        ELSE 'Not Applicable'
    END as MEDICAL_STATUS,
    CASE 
        WHEN LV.HR_APPV_FLAG = 'A' AND LV.MGR_APPV_FLAG = 'A' THEN 'APPROVED'
        WHEN LV.HR_APPV_FLAG = 'R' OR LV.MGR_APPV_FLAG = 'R' THEN 'REJECTED'
        WHEN LV.HR_APPV_FLAG = 'D' OR LV.MGR_APPV_FLAG = 'D' THEN 'DELETED'
        ELSE 'PENDING'
    END as APPROVAL_STATUS,
    -- Calendar display properties
    CASE LVD.L_TYPE_GRP
        WHEN 'HLN' THEN '#FF6B6B'  -- Holiday Leave (Red)
        WHEN 'SLN' THEN '#4ECDC4'  -- Sick Leave (Teal)
        WHEN 'BLP' THEN '#45B7D1'  -- Business Leave (Blue)
        WHEN 'BLN' THEN '#96CEB4'  -- Personal Leave (Green)
        ELSE '#FFA07A'             -- Other (Light Salmon)
    END as DISPLAY_COLOR
FROM KPDBA.LEAVE LV
JOIN KPDBA.LEAVE_DETAIL LVD USING(LEAVE_ID)
JOIN KPDBA.LEAVE_M_TYPE_GRP LMT USING(L_TYPE_GRP)
JOIN KPDBA.EMPLOYEE E USING(EMP_ID)
WHERE TO_CHAR(LV.START_DATE, 'YYYY') = :as_yyyy
AND LVD.LEAVE_DATE BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                       AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
AND (:as_emp_id IS NULL OR LV.EMP_ID LIKE :as_emp_id)
AND LV.HR_APPV_FLAG <> 'D'
AND LV.CEO_APPV_FLAG <> 'D'
AND LV.CANCEL_FLAG = 'F'
ORDER BY LVD.LEAVE_DATE, LV.EMP_ID;

-- Query 3: Get Calendar Events with Holiday Context
-- ============================================================================
-- SQL_NO: 1003
-- Purpose: Unified calendar view combining events, holidays, and leaves
-- Parameters: :as_start_date, :as_end_date, :as_user_id
WITH calendar_base AS (
    -- Generate date range
    SELECT 
        TO_DATE(:as_start_date, 'DD/MM/YYYY') + LEVEL - 1 as CALENDAR_DATE
    FROM DUAL
    CONNECT BY LEVEL <= (TO_DATE(:as_end_date, 'DD/MM/YYYY') - TO_DATE(:as_start_date, 'DD/MM/YYYY') + 1)
),
holidays AS (
    -- Get holidays for the date range
    SELECT 
        TRUNC(NON_WORK_DATE) as EVENT_DATE,
        NON_WORK_DESC as TITLE,
        'HOLIDAY' as EVENT_TYPE,
        '#FF5722' as COLOR,
        'Y' as IS_ALL_DAY
    FROM KPDBA.NON_WORK
    WHERE TRUNC(NON_WORK_DATE) BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                                   AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
),
leaves AS (
    -- Get approved leaves
    SELECT 
        LVD.LEAVE_DATE as EVENT_DATE,
        E.EMP_FNAME || ' ' || E.EMP_LNAME || ' - ' || LMT.L_TYPE_GRP_DESC as TITLE,
        'LEAVE' as EVENT_TYPE,
        CASE LVD.L_TYPE_GRP
            WHEN 'HLN' THEN '#FF6B6B'
            WHEN 'SLN' THEN '#4ECDC4'
            ELSE '#45B7D1'
        END as COLOR,
        CASE WHEN LVD.QTY = 1 THEN 'Y' ELSE 'N' END as IS_ALL_DAY
    FROM KPDBA.LEAVE LV
    JOIN KPDBA.LEAVE_DETAIL LVD USING(LEAVE_ID)
    JOIN KPDBA.LEAVE_M_TYPE_GRP LMT USING(L_TYPE_GRP)
    JOIN KPDBA.EMPLOYEE E USING(EMP_ID)
    WHERE LVD.LEAVE_DATE BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                             AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
    AND LV.HR_APPV_FLAG = 'A'
    AND LV.MGR_APPV_FLAG = 'A'
    AND LV.CANCEL_FLAG = 'F'
),
calendar_events AS (
    -- Get regular calendar events (if using new calendar_events table)
    SELECT 
        CE_START_DATE as EVENT_DATE,
        CE_TITLE as TITLE,
        'EVENT' as EVENT_TYPE,
        CASE CE_CATEGORY
            WHEN 'meeting' THEN '#9C27B0'
            WHEN 'task' THEN '#FF9800'
            ELSE '#2196F3'
        END as COLOR,
        CASE CE_IS_ALL_DAY WHEN 1 THEN 'Y' ELSE 'N' END as IS_ALL_DAY
    FROM calendar_events
    WHERE CE_START_DATE BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                            AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
    AND CE_STATUS = 'confirmed'
    AND (:as_user_id IS NULL OR CR_UID = :as_user_id)
)
-- Combine all event types
SELECT 
    CB.CALENDAR_DATE,
    TO_CHAR(CB.CALENDAR_DATE, 'DD/MM/YYYY') as FORMATTED_DATE,
    TO_CHAR(CB.CALENDAR_DATE, 'DAY') as DAY_NAME,
    -- Check if it's a weekend
    CASE 
        WHEN TO_CHAR(CB.CALENDAR_DATE, 'D') IN ('1', '7') THEN 'Y'
        ELSE 'N'
    END as IS_WEEKEND,
    -- Check if it's a holiday
    CASE 
        WHEN EXISTS (SELECT 1 FROM holidays H WHERE H.EVENT_DATE = CB.CALENDAR_DATE) THEN 'Y'
        ELSE 'N'
    END as IS_HOLIDAY,
    -- Aggregate events for the day
    LISTAGG(
        CASE 
            WHEN H.TITLE IS NOT NULL THEN H.TITLE
            WHEN L.TITLE IS NOT NULL THEN L.TITLE  
            WHEN CE.TITLE IS NOT NULL THEN CE.TITLE
        END, '; '
    ) WITHIN GROUP (ORDER BY EVENT_TYPE) as EVENTS_SUMMARY,
    -- Count events by type
    COUNT(H.EVENT_DATE) as HOLIDAY_COUNT,
    COUNT(L.EVENT_DATE) as LEAVE_COUNT,
    COUNT(CE.EVENT_DATE) as EVENT_COUNT
FROM calendar_base CB
LEFT JOIN holidays H ON H.EVENT_DATE = CB.CALENDAR_DATE
LEFT JOIN leaves L ON L.EVENT_DATE = CB.CALENDAR_DATE  
LEFT JOIN calendar_events CE ON CE.EVENT_DATE = CB.CALENDAR_DATE
GROUP BY CB.CALENDAR_DATE
ORDER BY CB.CALENDAR_DATE;

-- Query 4: Get Employee Leave Balance with Holiday Impact
-- ============================================================================
-- SQL_NO: 1004
-- Purpose: Calculate leave balances considering holidays and non-work days
-- Parameters: :as_emp_id, :as_yyyy
SELECT 
    E.EMP_ID,
    E.EMP_FNAME || ' ' || E.EMP_LNAME as EMPLOYEE_NAME,
    E.START_DATE as EMPLOYMENT_START,
    -- Leave entitlements
    NVL(LR_HLN.QTY, 0) as HOLIDAY_ENTITLEMENT,
    NVL(LR_SLN.QTY, 0) as SICK_ENTITLEMENT,
    NVL(LR_BLP.QTY, 0) as BUSINESS_ENTITLEMENT,
    -- Leave used
    NVL(LU_HLN.USED, 0) as HOLIDAY_USED,
    NVL(LU_SLN.USED, 0) as SICK_USED,
    NVL(LU_BLP.USED, 0) as BUSINESS_USED,
    -- Leave remaining
    NVL(LR_HLN.QTY, 0) - NVL(LU_HLN.USED, 0) as HOLIDAY_REMAINING,
    NVL(LR_SLN.QTY, 0) - NVL(LU_SLN.USED, 0) as SICK_REMAINING,
    NVL(LR_BLP.QTY, 0) - NVL(LU_BLP.USED, 0) as BUSINESS_REMAINING,
    -- Holiday impact (days that would have been working days)
    (
        SELECT COUNT(*) 
        FROM KPDBA.NON_WORK NW
        WHERE TO_CHAR(NW.NON_WORK_DATE, 'YYYY') = :as_yyyy
        AND TO_CHAR(NW.NON_WORK_DATE, 'D') NOT IN ('1', '7') -- Exclude weekends
    ) as HOLIDAY_IMPACT_DAYS
FROM KPDBA.EMPLOYEE E
-- Leave entitlements
LEFT JOIN (
    SELECT LRD.EMP_ID, SUM(LRD.QTY) as QTY
    FROM KPDBA.LEAVE_RIGHT_HEAD LRH
    JOIN KPDBA.LEAVE_RIGHT_DETAIL LRD USING(L_RIGHT_ID)
    WHERE LRH.L_RIGHT_YEAR = :as_yyyy 
    AND LRD.L_TYPE_GRP = 'HLN'
    AND LRH.CANCEL_FLAG = 'F' AND LRD.CANCEL_FLAG = 'F'
    GROUP BY LRD.EMP_ID
) LR_HLN ON E.EMP_ID = LR_HLN.EMP_ID
LEFT JOIN (
    SELECT LRD.EMP_ID, SUM(LRD.QTY) as QTY
    FROM KPDBA.LEAVE_RIGHT_HEAD LRH
    JOIN KPDBA.LEAVE_RIGHT_DETAIL LRD USING(L_RIGHT_ID)
    WHERE LRH.L_RIGHT_YEAR = :as_yyyy 
    AND LRD.L_TYPE_GRP = 'SLN'
    AND LRH.CANCEL_FLAG = 'F' AND LRD.CANCEL_FLAG = 'F'
    GROUP BY LRD.EMP_ID
) LR_SLN ON E.EMP_ID = LR_SLN.EMP_ID
LEFT JOIN (
    SELECT LRD.EMP_ID, SUM(LRD.QTY) as QTY
    FROM KPDBA.LEAVE_RIGHT_HEAD LRH
    JOIN KPDBA.LEAVE_RIGHT_DETAIL LRD USING(L_RIGHT_ID)
    WHERE LRH.L_RIGHT_YEAR = :as_yyyy 
    AND LRD.L_TYPE_GRP = 'BLP'
    AND LRH.CANCEL_FLAG = 'F' AND LRD.CANCEL_FLAG = 'F'
    GROUP BY LRD.EMP_ID
) LR_BLP ON E.EMP_ID = LR_BLP.EMP_ID
-- Leave usage
LEFT JOIN (
    SELECT LV.EMP_ID, SUM(LVD.QTY) as USED
    FROM KPDBA.LEAVE LV
    JOIN KPDBA.LEAVE_DETAIL LVD USING(LEAVE_ID)
    WHERE TO_CHAR(LV.START_DATE, 'YYYY') = :as_yyyy
    AND LVD.L_TYPE_GRP = 'HLN'
    AND LV.HR_APPV_FLAG = 'A' AND LV.CANCEL_FLAG = 'F'
    GROUP BY LV.EMP_ID
) LU_HLN ON E.EMP_ID = LU_HLN.EMP_ID
LEFT JOIN (
    SELECT LV.EMP_ID, SUM(LVD.QTY) as USED
    FROM KPDBA.LEAVE LV
    JOIN KPDBA.LEAVE_DETAIL LVD USING(LEAVE_ID)
    WHERE TO_CHAR(LV.START_DATE, 'YYYY') = :as_yyyy
    AND LVD.L_TYPE_GRP = 'SLN'
    AND LV.HR_APPV_FLAG = 'A' AND LV.CANCEL_FLAG = 'F'
    GROUP BY LV.EMP_ID
) LU_SLN ON E.EMP_ID = LU_SLN.EMP_ID
LEFT JOIN (
    SELECT LV.EMP_ID, SUM(LVD.QTY) as USED
    FROM KPDBA.LEAVE LV
    JOIN KPDBA.LEAVE_DETAIL LVD USING(LEAVE_ID)
    WHERE TO_CHAR(LV.START_DATE, 'YYYY') = :as_yyyy
    AND LVD.L_TYPE_GRP = 'BLP'
    AND LV.HR_APPV_FLAG = 'A' AND LV.CANCEL_FLAG = 'F'
    GROUP BY LV.EMP_ID
) LU_BLP ON E.EMP_ID = LU_BLP.EMP_ID
WHERE E.EMP_ID = :as_emp_id
AND (E.RESIGN_DATE IS NULL OR E.RESIGN_DATE > TRUNC(SYSDATE));