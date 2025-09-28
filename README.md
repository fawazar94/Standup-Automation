
# Daily Standup Automation for Slack (Google Sheets + Apps Script)

This project helps you automate your daily standups using Google Sheets and Apps Script.  
It generates a ready-to-paste Slack message, tracks weekly hours, and simplifies reporting with just a few clicks.

---

## Notes
This script was originally built for my personal use, so it might not be perfect.  
- The **Backfill a Date** feature is included but **not fully tested**, as I never needed it myself.  
- The tool works best when you post your standup **at the end of the day**, not at the beginning.  
  - It’s designed to include today’s hours in the weekly total.  
  - If you post in the morning, it won’t reflect today’s hours correctly.
- If you have coding knowledge and with the help of AI, you can modify it to your liking.
- Otherwise, you can just use it as-is and **post at the end of the day**, which works perfectly.
- You can notify your program director that you post your standup at the end of the day.

---

## Step 1: Create Your Sheet
1. Open **Google Sheets** and create a new blank sheet.
2. In **row 1**, add these exact headers starting from column A:
   ```
   Date | Name | Hours Text | Day Total | Week Total | Yesterday | Today
   ```
3. Freeze the header row:  
   - **View → Freeze → 1 row**

Your sheet should look like this:

| Date       | Name  | Hours Text | Day Total | Week Total | Yesterday | Today |
|------------|-------|------------|-----------|------------|-----------|-------|

---

## Step 2: Add the Script
1. In the sheet, go to **Extensions → Apps Script**.  
   - **Screen reader users:** Press `Alt + N`, then down arrow until you hear **Apps Script**, then press Enter.
2. Delete any placeholder code.
3. Paste the full script from `standup-script.js` into the editor.
4. At the **top of the script**, there are two key settings you should configure:
   ```javascript
   /***** CONFIG *****/
   const USER_NAME       = 'Your Name';     // <-- change this to your name
   const WORK_HOURS_TEXT = '11 to 4';       // <-- change this to your typical working hours
   const TZ              = 'Europe/Berlin'; // time zone for date formatting (leave as is unless needed)
   /******************/
```

   - **USER_NAME** → Replace `'Your Name'` with your own name so your Slack post starts with something like `"Alice’s Daily Standup"`.
- **WORK_HOURS_TEXT** → Replace `'11 to 4'` with the hours you usually work, e.g., `'9 to 5'`.  
  This text will appear in your Slack post under “My Hours Today.”
- **TZ (Time Zone)** → This just affects how dates are displayed.  
  You can leave it as `'Europe/Berlin'` unless you specifically need to see a different timezone format.
5. Save the script.

---

## Step 3: Authorize the Script
1. Back in the script editor, from the dropdown at the top, select `endOfDay`.
2. Click **Run**.
3. Google will ask for permissions:
   - Choose your Google account.
   - Click **Allow**.
4. Reload the sheet — you should now see a **Standup** menu at the top.

**Screen reader tip:**  
To get to the Standup menu using a screen reader:
- Press `Alt + F`, then **left arrow once** to move to the Standup menu.

---

## Step 4: Using the Tool
**Every day at the end of the day:**
1. Go to **Standup → End of Day (One Click)**.
2. Enter your tasks **separated by semicolons `;`**.  
   Example:
   ```
   Completed report (2); Meeting with team (0.5); Admin duties (0.25)
   ```
3. The script will:
   - Calculate today’s total automatically.
   - Add to the weekly total (resets every Monday).
   - Build a ready-to-paste Slack message.

4. Go to the **Post** sheet to copy the message:
   - **Screen reader users:** Press `Alt + Down Arrow` **twice** to move to the Post sheet.
   - Cell **A1** will always contain your formatted standup text.
   - Press `Control + C` to copy it.

5. Paste it directly into Slack.

---

## Sample Slack Output
```
Alice’s Daily Standup

Today’s Date: August 30, 2025

TOTAL HOURS THIS WEEK: 7.75

My Hours Today: 11 to 4

yesterday:
- Completed report (2)
- Meeting with team (0.5)

today:
- Admin duties (0.25)
```

---

## Step 5: Optional - Backfill Past Days
If you forgot to log a past day:
- Go to **Standup → Backfill a Date**
- Enter the date and tasks
- Weekly totals will update automatically

⚠️ **Note:** This feature is provided but **not fully tested**.

---

## Summary of Keyboard Shortcuts (Screen Reader Users)
| Action                  | Shortcut            |
|-------------------------|--------------------|
| Move to Post sheet      | Alt + Down Arrow (twice) |
| Copy standup from Post!A1 | Control + C         |
| Open Extensions menu    | Alt + N, then Down Arrow until "Apps Script" |
| Open Standup menu       | Alt + F, then Left Arrow once |

---

## Full Script
Copy the full script from the file [`standup-script.js`](standup-script.js).

---

## License
This project is provided under the MIT License — feel free to use and modify it.
