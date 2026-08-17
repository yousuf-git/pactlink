### **Design Philosophy & Overall Vibe**

* **Style:** Modern Enterprise B2B SaaS, clean, minimalist, and highly functional.
* **Focus:** Data clarity, workflow optimization (specifically accounting/finance), and reduced cognitive load through generous whitespace.
* **Theme:** Light mode only, high contrast between foreground text and backgrounds, with soft interactive states.

---

### **Color Palette**

* **Backgrounds:** * Main App Background: Very light cool gray (e.g., `#F4F5F7` or Tailwind `slate-50`).
* Containers/Cards: Solid White (`#FFFFFF`) to pop against the app background.
* Sidebar Active Item: Soft pale blue (e.g., `#EDF4FF`).


* **Typography:**
* Primary Text (Headings, Values): Dark slate/near black (e.g., `#111827` or Tailwind `gray-900`).
* Secondary Text (Labels, Dates, Descriptions): Muted gray (e.g., `#6B7280` or Tailwind `gray-500`).


* **Accents & Interactions:**
* Primary Brand/Action Color: Vibrant medium blue (e.g., `#2563EB` or Tailwind `blue-600`). Used for the logo, active sidebar icons, text links, and primary button borders/text.
* Status Indicators (Success/Active): Soft mint green background (`#DEF7EC`) with darker green text (`#03543F`).


* **Borders:** Very subtle, light gray (e.g., `#E5E7EB` or Tailwind `gray-200`).

---

### **Typography**

* **Font Family:** Clean, modern Sans-Serif (e.g., Inter, Roboto, or SF Pro).
* **Hierarchy:**
* **Page Titles & Main Values:** 20px-24px, Semibold (e.g., `$10,421.10`).
* **Card Titles:** 16px, Semibold (e.g., `PO-6402`).
* **Standard Body:** 14px, Regular (e.g., descriptions, dates).
* **Labels/Metadata:** 12px-13px, Regular, secondary text color.



---

### **Layout Architecture**

Implement a full-viewport, three-pane layout:

1. **Left Sidebar (Navigation):** Fixed width (approx 240px).
2. **Center Column (Action/List Area):** Fluid width, contains the primary workflow (Purchase order matching).
3. **Right Column (Preview Area):** Fixed or fluid width (approx 45% of the screen), used for document preview.

---

### **Component Specifications**

#### 1. Sidebar Navigation

* **Header:** App logo top left, accompanied by small help (`?`) and notification bell icons aligned to the right of the sidebar width.
* **Menu Items:** Vertical list. Uses simple, line-art icons next to text.
* **Active State:** Background becomes soft blue, icon and text turn primary blue. Rounded corners on the active state pill (approx `8px`).
* **Footer:** User profile block stuck to the bottom. Small avatar, bold name, and smaller regular role ("Admin") inside a light gray rounded rectangle.

#### 2. Top Action Bar (Center Column)

* **Left Side:** Back arrow icon + Large bold total amount + "to [Vendor Name]" + small gray "Draft" tag.
* **Right Side:** "Activity log" secondary button (icon + text, outline/ghost style) + vertical ellipsis menu.

#### 3. Main Content Area (Purchase Order Cards)

* **Container:** White background, rounded corners (`12px`), subtle border or very soft drop shadow.
* **Card Layout:** Stacked list of items. Each acts as a selectable row.
* **Card Anatomy:**
* **Header:** Checkbox (left), bold PO number, green "Active" badge, external link icon (right-aligned).
* **Body (Grid/Flex):** Two-column layout for key-value pairs.
* Labels on the left (Balance, Requestor, Date, Description) in small, secondary text.
* Values on the right in primary text.
* *Special formatting:* "Balance" shows the current amount in bold, slash, total amount in lighter gray. "Requestor" includes a tiny circular user avatar next to the name.


* **Footer:** "Show items" text link in primary blue with a downward chevron.



#### 4. Bottom Action Bar (Center Column)

* Fixed at the bottom of the center pane.
* Contains standard navigation: "Back" (bold text, left), "Match lines" (Primary action, rounded rectangular button, blue border, white background, blue text), "Next" (Disabled state, gray background, gray text).

#### 5. Document Preview Panel (Right Column)

* **Background:** Muted gray (slightly darker than the main app background to create depth).
* **Document Canvas:** A centered, white rectangle simulating a physical paper page (A4 proportion). Contains standard invoice layout (header, table, totals, instructions).
* **Floating Controls:** Centered at the bottom over the gray background. Pill-shaped white container holding zoom icons (`+`, `-`), pagination (`< 1 / 8 >`), fullscreen icon, and action menu.