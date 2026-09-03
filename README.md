# LoanFlow Hub

Build a professional, production-quality **Loan & Door-to-Door EMI Collection Management System frontend only**.

IMPORTANT:

* FRONTEND ONLY.
* Do NOT create a backend.
* Do NOT create a database.
* Do NOT create authentication APIs.
* Do NOT use Supabase.
* Do NOT use Firebase.
* Use realistic mock/demo data and local frontend state only.
* Every button, navigation item, tab, search, filter, modal, dropdown, form and interaction should work on the frontend using mock data/local state.
* Structure the frontend cleanly so a backend/API can be connected later without redesigning the UI.

## DESIGN DIRECTION

Use the visual language of modern **Shadcn Dashboard 2 / shadcn/ui admin dashboards** as inspiration.

Do NOT copy the template exactly. Create an original loan-management interface using the same professional design principles:

* Clean SaaS/admin dashboard
* Modern shadcn/ui style
* Tailwind CSS
* Responsive
* Mobile-first collection workflow
* Professional typography
* Neutral backgrounds
* Thin borders
* Rounded cards
* Subtle shadows
* Clean tables
* Compact but spacious layout
* Clear hierarchy
* Excellent empty states
* Skeleton/loading states where appropriate
* Professional status badges
* Accessible components
* Consistent spacing
* No excessive gradients
* No excessive animations
* No unnecessary decorative graphics

The application must feel like a real financial/loan management product, not a generic dashboard template.

## THEME SYSTEM

Implement THREE appearance modes:

1. LIGHT MODE
2. DARK MODE
3. NIGHT MODE

Add a theme switcher in the top-right header.

### Light Mode

* White/very light neutral background
* Dark text
* Light cards
* Subtle borders
* Professional blue/indigo primary accent

### Dark Mode

* Dark neutral background
* Slightly lighter cards
* White/light text
* Subtle borders
* Same primary accent

### Night Mode

Create a deeper, softer night theme specifically for low-light use:

* Very dark background
* Dark elevated cards
* Softer contrast
* Reduced visual intensity
* Comfortable text contrast
* Avoid pure #000 everywhere
* Preserve readable tables and status colors

The theme must apply consistently to:

* Sidebar
* Header
* Cards
* Tables
* Forms
* Dialogs
* Dropdowns
* Charts
* Badges
* Navigation
* Mobile navigation

Persist the selected theme locally in frontend state/localStorage.

Add:

* Light
* Dark
* Night
* System option if appropriate

Do not use bright colors as the main background.

## APPLICATION NAME

Use a professional placeholder name:

**LoanFlow**

Subtitle:

**Loan & EMI Collection Management**

Make the branding easy to replace later.

---

# MAIN APPLICATION STRUCTURE

Create these frontend pages/routes:

1. Login
2. Dashboard
3. Customers
4. Customer Profile
5. Accounts
6. Credit Limits
7. Loans
8. Loan Details
9. EMI Management
10. Today's Collection
11. Collect EMI
12. Receipts
13. Visits
14. Overdue
15. Reports
16. Documents
17. Settings
18. Profile

---

# 1. LOGIN PAGE

Create a clean professional login screen.

Elements:

* Logo
* LoanFlow
* "Loan & EMI Collection Management"
* Email/mobile input
* Password input
* Show/hide password
* Remember me
* Forgot password
* Login button

Frontend only.

Use mock login behavior.

Example demo credentials:

Email:
[admin@loanflow.demo](mailto:admin@loanflow.demo)

Password:
123456

Show a small demo-login hint.

After login navigate to Dashboard.

---

# 2. MAIN APP SHELL

Desktop:

Left sidebar + top header + content area.

Mobile:

Collapsible sidebar/drawer + mobile header + bottom navigation for important actions.

### Sidebar

Dashboard

Customers

* All Customers
* Add Customer

Accounts

* All Accounts
* Credit Limits
* Account Ledger

Loans

* Active Loans
* Overdue Loans
* Closed Loans
* New Loan

EMI

* Today's Due
* Upcoming
* Pending
* Overdue

Collection

* Collect EMI
* Today's Collection
* Daily Closing

Receipts

Visits

Reports

Documents

Settings

Profile

Add icons using lucide-react.

Sidebar should support collapse/expand.

Show active navigation state.

---

# 3. TOP HEADER

Include:

* Global search
* Search by Customer ID
* Search by mobile
* Search by name
* Search by Loan ID
* Notification icon
* Theme switcher
* Admin profile dropdown

Admin profile:

Admin User
Owner
[admin@loanflow.demo](mailto:admin@loanflow.demo)

Actions:

* My Profile
* Settings
* Logout

---

# 4. DASHBOARD

Create a highly polished financial dashboard.

Header:

"Good morning, Admin"

Subtitle:

"Here's your loan and collection overview."

Quick actions:

* Add Customer
* Create Loan
  Collect EMI

## KPI CARDS

1. Total Customers
   250

2. Active Loans
   180

3. Today's Due
   ₹85,000

4. Today's Collection
   ₹52,000

5. Pending Today
   ₹33,000

6. Total Outstanding
   ₹18.50L

7. Total Overdue
   ₹1.85L

8. This Month Collection
   ₹7.25L

Use trend indicators where appropriate.

## COLLECTION OVERVIEW

Create a responsive chart showing:

Expected Collection
Actual Collection

Allow:

* 7 Days
* 30 Days
* 3 Months
* 12 Months

## COLLECTION BY PAYMENT METHOD

Show:

Cash
₹35,000

UPI
₹18,000

Bank
₹7,500

## TODAY'S COLLECTION TABLE

Columns:

Customer
Customer ID
Loan ID
EMI
Due Date
Paid
Status
Action

Actions:

* View
* Collect
* Call
* Navigate

## OVERDUE CUSTOMERS

Show top overdue customers.

Include:

* Customer
* Days overdue
* Amount
* Last visit
* Action

---

# 5. CUSTOMERS PAGE

Professional data table.

Header:

Customers

Subtitle:
"Manage customer profiles and financial relationships."

Button:

* Add Customer

Search:
Customer ID / Name / Mobile

Filters:

* Active
* Inactive
* Blocked
* Has Loan
* Overdue

Table:

Customer ID
Photo
Customer Name
Mobile
Account
Active Loans
Outstanding
Overdue
Status
Actions

Actions:
View
Edit
Create Loan
Collect EMI

Add pagination.

Add sorting.

Add column visibility control.

---

# 6. ADD CUSTOMER

Create a polished multi-section form.

Sections:

## Personal Information

* Photo
* Full Name
* Father/Husband Name
* Mobile
* Alternate Mobile
* DOB
* Gender
* Occupation
* Monthly Income

## Address

* House/Street
* Area/Village
* City
* District
* State
* PIN
* Landmark

## KYC

* KYC Type
* KYC Number
* ID Proof
* Address Proof

## Nominee

* Name
* Relationship
* Mobile
* Address

## Guarantor

* Name
* Mobile
* Relationship
* Address

Buttons:
Cancel
Save Customer

After saving, generate:

CUS-000251

Show success dialog.

---

# 7. CUSTOMER PROFILE

This is one of the most important screens.

Create a premium customer-detail page.

Header:

Profile photo

Ravi Kumar

CUS-000125

ACC-000125

98XXXXXXXX

Status: Active

Action buttons:

Call
WhatsApp
Navigate
Collect EMI
New Loan

## FINANCIAL SUMMARY

Cards:

Credit Limit
₹2,00,000

Used Limit
₹1,40,000

Available Limit
₹60,000

Outstanding
₹1,40,000

Overdue
₹10,000

## TABS

Overview
Personal
KYC
Account
Loans
EMI Schedule
Payments
Visits
Documents
Activity

## OVERVIEW

Show:

* Current EMI
* Next Due Date
* Total Paid
* Total Borrowed
* Outstanding
* Overdue
* Repayment progress

Include a repayment progress indicator.

---

# 8. ACCOUNTS

Account table.

Columns:

Account Number
Customer
Customer ID
Credit Limit
Used Limit
Available Limit
Outstanding
Status
Actions

Example:

ACC-000125

Account details page should show:

Credit Limit
Used Credit
Available Credit
Outstanding
Overdue
Ledger

---

# 9. CREDIT LIMIT MANAGEMENT

Create dedicated page.

Show:

Customer
Customer ID
Approved Limit
Used Limit
Available Limit
Outstanding
Status

Action:

Edit Limit

Dialog:

Current Limit
New Limit
Reason

Save.

Display limit history:

Old Limit
New Limit
Reason
Date
Changed By

Frontend mock data only.

---

# 10. LOANS PAGE

Tabs:

Active
Overdue
Closed

Table:

Loan ID
Customer
Customer ID
Loan Amount
Interest
Tenure
EMI
Paid
Outstanding
Start Date
Status
Actions

Buttons:

View
Edit
Collect
Close

---

# 11. CREATE LOAN

Professional loan creation form.

Customer search:

Search Customer ID / Name / Mobile

After selecting customer show:

Customer Profile
Credit Limit
Current Outstanding
Available Limit

Loan fields:

Loan Amount
Interest Rate
Interest Method
Processing Fee
Tenure
EMI Frequency
Start Date
First EMI Date

Interest methods:

Flat
Reducing Balance

Show a live loan summary:

Principal
Interest
Fees
Total Payable
EMI Amount

Show warning if loan exceeds available credit limit.

Button:

Create Loan

After creation:

Generate Loan ID:
LN-000251

Automatically generate EMI schedule in frontend mock state.

---

# 12. LOAN DETAILS

Header:

LN-000125

Ravi Kumar
CUS-000125

Show:

Loan Amount
Interest
Tenure
EMI
Total Payable
Total Paid
Outstanding
Start Date
End Date
Status

Tabs:

Overview
EMI Schedule
Payments
Ledger
Documents

---

# 13. EMI MANAGEMENT

Create tabs:

Today's Due
Upcoming
Pending
Overdue
Paid

Table:

EMI ID
Customer
Loan ID
EMI No
Due Date
Amount
Paid
Remaining
Status
Action

Actions:

Collect
View
Payment History

Status colors:

Paid = green
Due = amber
Partial = orange
Overdue = red
Upcoming = blue

---

# 14. TODAY'S COLLECTION

Make this one of the fastest screens.

Header:

Today's Collection

Summary:

Expected
₹85,000

Collected
₹52,000

Pending
₹33,000

Customers Due
20

Customers Paid
15

Customers Pending
5

Search Customer ID.

Table:

Customer
Customer ID
Address
EMI
Due
Status
Action

Action button:

Collect EMI

Also provide:
Call
Navigate

---

# 15. COLLECT EMI

Create a dedicated mobile-friendly collection screen.

Search:

Customer ID

Example:

CUS-000125

Show:

Ravi Kumar
CUS-000125
ACC-000125
LN-000125

Current EMI:
₹10,000

Overdue:
₹0

Outstanding:
₹70,000

Due Date:
03 Sep 2026

## PAYMENT

Amount:

₹10,000

Payment Method:

Cash
UPI
Bank Transfer

Notes

Button:

CONFIRM PAYMENT

Before confirmation show summary dialog.

After confirmation:

Payment Successful

₹10,000 Collected

Payment ID:
PAY-001254

Receipt:
RCP-2026-00125

Buttons:

View Receipt
Share Receipt
Done

Update all frontend mock state.

---

# 16. PARTIAL PAYMENT

Support partial payments.

Example:

EMI:
₹10,000

Received:
₹6,000

Remaining:
₹4,000

Status:
Partial

Show clearly.

---

# 17. RECEIPTS

Receipt list:

Receipt Number
Customer
Customer ID
Loan ID
Amount
Payment Method
Date
Status
Actions

Actions:

View
Print
Download
Share

Create professional receipt preview.

---

# 18. VISITS

Create home-collection visit management.

Today's visits.

Fields:

Customer
Customer ID
Address
Due Amount
Visit Date
Status
Next Visit

Statuses:

Planned
Visited
Paid
Partially Paid
Not Paid

If not paid, show reason:

Customer unavailable
House locked
Insufficient money
Requested more time
Other

Allow:

Next Visit Date

---

# 19. OVERDUE

Create a dedicated overdue dashboard.

Top cards:

Overdue Customers
24

Overdue EMIs
31

Overdue Amount
₹1,85,000

Table:

Customer
Customer ID
Loan ID
EMI
Due Date
Days Overdue
Amount
Last Visit
Next Visit
Action

Actions:

Collect
Call
Navigate
View Customer

---

# 20. REPORTS

Create a professional reports center.

Reports:

Daily Collection
Monthly Collection
Pending EMI
Overdue EMI
Upcoming EMI
Customer Statement
Loan Report
Outstanding Report
Interest Report
Payment Report
Cash / UPI / Bank
Loan Disbursement
Visit Report
Account Ledger
Business Performance

Every report should have:

Date Range
Customer filter
Loan filter
Payment method
Status

Buttons:

Filter
Reset
Export PDF
Export Excel
Print

Since this is frontend-only, simulate exports with mock/download behavior or clear frontend placeholders.

---

# 21. REPORT DASHBOARD

Show:

Total Disbursed
₹12.50L

Total Collected
₹8.75L

Outstanding
₹9.50L

Overdue
₹75K

Collection Rate
85%

Charts:

Monthly Collection
Loan Disbursement
Principal vs Interest
Overdue Trend

---

# 22. CUSTOMER STATEMENT

Create a printable statement.

Header:

LoanFlow

Customer:
Ravi Kumar

Customer ID:
CUS-000125

Account:
ACC-000125

Show:

Credit Limit
Total Borrowed
Total Paid
Outstanding
Overdue

Transaction table:

Date
Description
Debit
Credit
Balance

Include EMI/payment history.

---

# 23. DOCUMENTS

Document management frontend.

Customer documents:

* ID Proof
* Address Proof
* PAN
* Loan Agreement
* Photograph
* Guarantor Documents
* Other

Actions:

Upload
View
Download
Delete

Use mock files.

---

# 24. PROFILE

Admin profile page.

Show:

Profile photo
Name
Role
Email
Mobile

Editable:

Name
Email
Mobile
Profile photo

Security:

Change Password
Session information

---

# 25. SETTINGS

Sections:

Business Profile
Loan Settings
EMI Settings
Payment Methods
Receipt Settings
ID Numbering
Appearance
Notifications
Backup

Business:

Business Name
Logo
Address
Phone
Email

Number formats:

CUS-000001
ACC-000001
LN-000001
EMI-000001
PAY-000001
RCP-2026-000001

---

# 26. NOTIFICATIONS

Notification center.

Examples:

"5 EMIs are overdue."

"12 customers have EMI due today."

"₹52,000 collected today."

"Customer Ravi has a pending ₹4,000 partial EMI."

Notification dropdown in header.

---

# 27. EMPTY STATES

Every page must have a polished empty state.

Examples:

No customers yet.

No loans found.

No overdue EMIs.

No payments found.

Use useful CTA buttons.

---

# 28. RESPONSIVE DESIGN

Desktop:

* Full sidebar
* Large dashboard
* Tables
* Charts

Tablet:

* Collapsible sidebar
* Responsive cards

Mobile:

* Drawer navigation
* Compact KPI cards
* Mobile-friendly tables/cards
* Large collection buttons
* Bottom navigation

Mobile bottom navigation:

Home
Customers
Collect
EMI
More

The collection flow must be optimized for one-handed use.

---

# 29. ACCESSIBILITY

Implement:

* Keyboard navigation
* Visible focus states
* Proper labels
* Accessible dialogs
* Accessible dropdowns
* Accessible tables
* Sufficient contrast
* Tooltips where helpful
* Screen-reader friendly buttons

---

# 30. COMPONENT SYSTEM

Use reusable shadcn/ui components:

* Button
* Card
* Input
* Select
* Dialog
* Sheet
* Dropdown Menu
* Tabs
* Badge
* Table
* Calendar
* Date Picker
* Tooltip
* Alert
* Toast
* Progress
* Avatar
* Breadcrumb
* Separator
* Skeleton
* Command/Search

Use Lucide icons.

Avoid creating inconsistent custom UI components when an appropriate shadcn component exists.

---

# 31. MOCK DATA

Create realistic mock data for at least:

* 20 customers
* 25 loans
* EMI schedules
* Payments
* Receipts
* Visits
* Overdue records

Use Indian Rupee formatting:

₹10,000
₹1,25,000
₹18.50L

Use Indian-style dates where appropriate.

Do not use lorem ipsum.

Use realistic names and business data.

---

# 32. FRONTEND STATE

Use frontend state management/local mock state.

When user:

* Creates customer
* Creates loan
* Records payment
* Records partial payment
* Changes credit limit
* Creates visit
* Updates profile

the visible UI should update immediately.

Do not pretend the data is saved to a real backend.

---

# 33. IMPORTANT FINANCIAL UI RULES

Never display:

NaN
undefined
Infinity
negative unexplained balances

Validate:

* Loan amount > 0
* EMI > 0
* Payment amount > 0
* Credit limit >= 0
* Tenure > 0

Prevent accidental duplicate payment submission in the UI.

Show confirmation before recording payment.

---

# 34. VISUAL QUALITY

The final UI should look like a premium SaaS product.

Avoid:

* Huge unnecessary hero sections
* Excessive gradients
* Excessive rounded cards
* Huge typography
* Clutter
* Random colors
* Generic stock images
* Decorative illustrations that don't help the workflow

Prioritize:

* Data clarity
* Fast collection
* Financial readability
* Professional tables
* Excellent spacing
* Consistent components
* Mobile usability

---

# 35. MOST IMPORTANT USER FLOW

Optimize this workflow above everything else:

Customer arrives / owner visits customer

↓

Search Customer ID

↓

Open Customer Profile

↓

See Current EMI

↓

Click Collect EMI

↓

Enter Amount

↓

Choose Cash / UPI / Bank

↓

Confirm Payment

↓

Payment Success

↓

Generate Receipt

↓

Return to Today's Collection

This should require as few clicks as reasonably possible.

---

# 36. IMPORTANT IDENTIFIERS

Use separate identifiers:

Customer:
CUS-000125

Account:
ACC-000125

Loan:
LN-000125

EMI:
EMI-000845

Payment:
PAY-001254

Receipt:
RCP-2026-00125

Visit:
VIS-000525

Never use one ID for multiple entity types.

---

# 37. FINAL QUALITY REQUIREMENT

Before completing the implementation:

* Check every route.
* Check every sidebar link.
* Check all buttons.
* Check dialogs.
* Check forms.
* Check search.
* Check filters.
* Check tabs.
* Check theme switching.
* Check Light mode.
* Check Dark mode.
* Check Night mode.
* Check responsive mobile layout.
* Check empty states.
* Check mock state updates.
* Check collection workflow.
* Check partial payment workflow.
* Check receipt workflow.
* Check credit-limit validation.
* Check loan creation.
* Check EMI schedule.
* Check overdue state.
* Check dashboard calculations.

Do not leave dead buttons or placeholder navigation.

The final product should feel like a complete, polished **Loan & Door-to-Door EMI Collection Management frontend**, ready to connect to a backend later.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/07d6883c-534f-497a-9b10-4266632e2551).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
