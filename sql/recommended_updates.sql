-- ============================================================================
-- RECOMMENDED SQL UPDATES FOR CALENDAR BACKEND ROUTES
-- ============================================================================
-- 
-- These are the recommended SQL updates to fix parameter binding issues
-- and improve performance by implementing proper date range filtering
-- at the database level instead of client-side filtering.
--

-- ============================================================================
-- 1. HOLIDAY/NON-WORK DAYS QUERY (SQL_NO: 700860001)
-- ============================================================================
-- Current query only uses :as_yyyy parameter
-- Recommended update to support date range filtering

-- RECOMMENDED UPDATE:
SELECT TO_CHAR(NON_WORK_DATE,'dd/mm/yyyy hh24:mi') NON_WORK_DATE,  
       NVL(NON_WORK_DESC,'') NON_WORK_DESC,
       TO_CHAR(NON_WORK_DATE, 'Day') DAY_NAME,
       'HOLIDAY' as CATEGORY,
       'N' as IS_RECURRING
FROM KPDBA.NON_WORK 
WHERE NON_WORK_DATE BETWEEN TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                        AND TO_DATE(:as_end_date, 'DD/MM/YYYY')
ORDER BY NON_WORK_DATE;

-- Alternative if date range parameters cannot be added:
-- Keep current query but add additional columns for better frontend integration
SELECT TO_CHAR(NON_WORK_DATE,'dd/mm/yyyy hh24:mi') NON_WORK_DATE,  
       NVL(NON_WORK_DESC,'') NON_WORK_DESC,
       TO_CHAR(NON_WORK_DATE, 'Day') DAY_NAME,
       'HOLIDAY' as CATEGORY,
       'N' as IS_RECURRING
FROM KPDBA.NON_WORK 
WHERE TO_NUMBER(TO_CHAR(NON_WORK_DATE,'yyyy')) BETWEEN :as_yyyy - 1 AND :as_yyyy + 1
ORDER BY NON_WORK_DATE;

-- ============================================================================
-- 2. LEAVE EVENTS QUERY (SQL_NO: 700860002)  
-- ============================================================================
-- Current query uses :as_yyyy and :as_ddmmyyyy parameters
-- Recommended update to support proper date range and employee filtering

-- RECOMMENDED UPDATE:
SELECT emp.emp_id,
       emp.emp_fname || ' ' || emp.emp_lname full_name,
       emp.unit_id,
       emp.unit_desc,
       emp.start_date,
       nvl(qt.hln,0) sum_hln,
       sum(decode(lv.l_type_grp, 'HLN', lv.qty, 0)) as used_hln,
       sum(decode(lv.l_type_grp, 'SLN', decode(lv.document_flag, 'T', lv.qty, 0), 0)) as used_sln,
       sum(decode(lv.l_type_grp, 'SLN', decode(lv.document_flag, 'F', lv.qty, 0), 0)) as used_sln_no_med,
       sum(decode(lv.l_type_grp, 'BLP', lv.qty, 0)) as used_blp,
       sum(decode(lv.l_type_grp, 'BLN', lv.qty, 0)) as used_bln,
       nvl(qt_002.bls,0) sum_bls,
       sum(decode(lv.l_type_grp, '002', lv.qty, 0)) as used_bls,
       -- Add leave details for calendar display
       lvd.leave_date,
       lvd.qty as duration,
       lv.l_type_grp as leave_type,
       lv.hr_appv_flag as approval_status
FROM 
(select emp_id, emp_fname, emp_lname, start_date, resign_date, employee.unit_id, unit.unit_desc, comp_id 
 from kpdba.employee, kpdba.unit 
 where employee.unit_id = unit.unit_id 
   and (resign_date is null or resign_date > trunc(sysdate))
   and (:as_emp_id = '%' or emp_id like :as_emp_id)) emp,
( 
    select lv.leave_id, lv.emp_id, l_type_grp, document_flag, sum(qty) qty
    from kpdba.leave lv, kpdba.leave_detail lvd 
    where lv.leave_id = lvd.leave_id 
      and lv.hr_appv_flag <> 'D' 
      and lv.cancel_flag = 'F' 
      and to_char(lv.start_date, 'yyyy') = :as_yyyy 
      and leave_date between TO_DATE(:as_start_date, 'DD/MM/YYYY') 
                         and TO_DATE(:as_end_date, 'DD/MM/YYYY')
    group by lv.leave_id, lv.emp_id, l_type_grp, document_flag
) lv,
-- ... rest of the query with existing leave quota subqueries ...
-- ... (include all the existing qt, qt_002, etc. subqueries) ...
where emp.emp_id = lv.emp_id(+)
  and emp.emp_id = qt.emp_id(+)
  and emp.emp_id = qt_bls.emp_id(+)
  and emp.emp_id = qt_001.emp_id(+)
  and emp.emp_id = qt_002.emp_id(+)
  and emp.emp_id = qt_003.emp_id(+)
  and emp.emp_id = qt_oth.emp_id(+) 
  and emp.emp_id = qt_blp.emp_id(+)
group by emp.emp_id, emp.emp_fname, emp.emp_lname, emp.unit_id, emp.unit_desc, 
         emp.comp_id, qt.hln, qt_bls.bls, qt_001.bls, qt_002.bls, qt_003.bls, 
         emp.start_date, emp.resign_date, qt_blp.blp,
         lvd.leave_date, lvd.qty, lv.l_type_grp, lv.hr_appv_flag
order by emp.emp_id, lvd.leave_date;

-- ============================================================================
-- 3. PARAMETER MAPPING DOCUMENTATION
-- ============================================================================

-- Holiday Query Parameters:
-- :as_yyyy       -> Year filter (currently used)
-- :as_start_date -> Start date for range filter (DD/MM/YYYY format)
-- :as_end_date   -> End date for range filter (DD/MM/YYYY format)

-- Leave Query Parameters:  
-- :as_yyyy       -> Year filter (currently used)
-- :as_start_date -> Start date for leave date range (DD/MM/YYYY format)
-- :as_end_date   -> End date for leave date range (DD/MM/YYYY format)
-- :as_emp_id     -> Employee ID filter (use '%' for all employees)

-- ============================================================================
-- 4. IMPLEMENTATION NOTES
-- ============================================================================

-- 1. Update SQL_TAB_SOA table with these new queries
-- 2. Test thoroughly in development environment
-- 3. Ensure Oracle date format consistency (DD/MM/YYYY)
-- 4. Consider performance impact of date range filtering
-- 5. Add proper indexes on NON_WORK_DATE and LEAVE_DATE columns if needed
-- 6. Update API documentation to reflect new filtering capabilities

-- Example update statements for SQL_TAB_SOA:
-- UPDATE KPDBA.SQL_TAB_SOA 
-- SET SQL_STMT = 'new_query_here'
-- WHERE SQL_NO = 700860001;

-- UPDATE KPDBA.SQL_TAB_SOA 
-- SET SQL_STMT = 'new_query_here'  
-- WHERE SQL_NO = 700860002;