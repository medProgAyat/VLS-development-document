// متغیرهای سراسری
let currentRequirements = [];
let currentEditingId = null;

// بارگذاری اولیه
document.addEventListener("DOMContentLoaded", function () {
  loadDocumentInfo();
  loadRequirements();
  setupEventListeners();

  // تنظیم تاریخ امروز
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("issueDate").value = today;
  document.getElementById("lastChangeDate").value = today;
  document.getElementById("reqLastChange").value = today;
});

// بارگذاری اطلاعات سند
async function loadDocumentInfo() {
  try {
    const response = await fetch("/api/requirements");
    if (response.ok) {
      const data = await response.json();
      // محاسبه تعداد صفحات بر اساس تعداد الزامات
      const totalPages = Math.ceil(data.length / 15) || 1;
      document.getElementById("totalPages").value = totalPages;
      document.getElementById("totalPagesFooter").textContent = totalPages;
    }
  } catch (error) {
    console.error("Error loading document info:", error);
  }
}

// بارگذاری الزامات
async function loadRequirements() {
  try {
    const response = await fetch("/api/requirements");
    if (response.ok) {
      currentRequirements = await response.json();
      renderRequirementsTable();
    }
  } catch (error) {
    console.error("Error loading requirements:", error);
  }
}

// رندر جدول الزامات
function renderRequirementsTable() {
  const tbody = document.getElementById("requirementsTableBody");
  tbody.innerHTML = "";

  currentRequirements.forEach((req) => {
    const row = document.createElement("tr");

    // تعیین کلاس وضعیت
    const needClass = req.type === "need" ? "need-status" : "want-status";
    const needText = req.type === "need" ? "نیاز" : "خواسته";

    // تعیین کلاس اهمیت
    let priorityClass = "";
    if (req.priority) {
      if (
        req.priority.includes("بسیار بالا") ||
        req.priority.includes("بالا")
      ) {
        priorityClass = "priority-high";
      } else if (req.priority.includes("متوسط")) {
        priorityClass = "priority-medium";
      } else {
        priorityClass = "priority-low";
      }
    }

    row.innerHTML = `
            <td>${req.number}</td>
            <td class="requirement-text">${req.requirement}</td>
            <td>${req.responsible}</td>
            <td><span class="${needClass}">${needText}</span></td>
            <td>
                <div>${req.type === "need" ? "-" : ""}</div>
                ${
                  req.type === "need"
                    ? ""
                    : `<div class="priority-badge ${priorityClass}">${req.priority}</div>`
                }
            </td>
            <td>${formatDate(req.lastChange)}</td>
            <td class="noPrint">
                <div class="action-buttons">
                    <button class="action-btn edit-btn" onclick="editRequirement('${
                      req.id
                    }')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteRequirement('${
                      req.id
                    }')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;

    tbody.appendChild(row);
  });

  // به روز رسانی شماره صفحه
  updatePageNumbers();
}

// فرمت تاریخ
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("fa-IR");
}

// به روز رسانی شماره صفحات
function updatePageNumbers() {
  const pageNumber = parseInt(document.getElementById("pageNumber").value) || 1;
  document.getElementById("currentPage").textContent = pageNumber;

  const totalPages = parseInt(document.getElementById("totalPages").value) || 1;
  document.getElementById("totalPagesFooter").textContent = totalPages;

  // به روز رسانی فوتر
  const orgName = document.getElementById("organization").value || "شرکت";
  document.getElementById("footerOrg").textContent = orgName;
}

// در تابع saveDocument، کد را به این صورت به روز کنید:
async function saveDocument() {
  const documentInfo = {
    projectName: document.getElementById("projectName").value,
    organization: document.getElementById("organization").value,
    department: document.getElementById("department").value,
    issueDate: document.getElementById("issueDate").value,
    lastChangeDate: new Date().toISOString().split("T")[0],
    version: document.getElementById("version").value,
    totalPages: parseInt(document.getElementById("totalPages").value) || 1,
  };

  try {
    const response = await fetch("/api/document-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentInfo),
    });

    if (response.ok) {
      const result = await response.json();
      alert("سند با موفقیت ذخیره شد.");
      document.getElementById("lastChangeDate").value = result.lastChangeDate;

      // به روز رسانی فوتر
      updatePageNumbers();
    } else {
      throw new Error("خطا در ذخیره‌سازی");
    }
  } catch (error) {
    console.error("Error saving document:", error);
    alert("خطا در ذخیره سند.");
  }
}

// و تابع resetDocument:
async function resetDocument() {
  if (confirm("آیا مطمئن هستید؟ تمام داده‌ها پاک خواهند شد.")) {
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });

      if (response.ok) {
        // بارگذاری مجدد صفحه
        window.location.reload();
      }
    } catch (error) {
      console.error("Error resetting document:", error);
      alert("خطا در بازنشانی سند.");
    }
  }
}

// باز کردن مودال اضافه کردن
function openAddModal() {
  document.getElementById("reqNumber").value = currentRequirements.length + 1;
  document.getElementById("reqLastChange").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("addRequirementModal").style.display = "block";
}

// بستن مودال اضافه کردن
function closeAddModal() {
  document.getElementById("addRequirementModal").style.display = "none";
  document.getElementById("reqText").value = "";
  document.getElementById("reqResponsible").value = "";
  document.getElementById("reqPriority").value = "متوسط";
  document.querySelector('input[name="reqType"][value="need"]').checked = true;
  togglePriorityField();
}

// تغییر نمایش فیلد اهمیت
function togglePriorityField() {
  const type = document.querySelector('input[name="reqType"]:checked').value;
  const priorityField = document.getElementById("priorityField");

  if (type === "want") {
    priorityField.style.display = "block";
    document.getElementById("reqPriority").required = true;
  } else {
    priorityField.style.display = "none";
    document.getElementById("reqPriority").required = false;
  }
}

// اضافه کردن الزام جدید
async function addRequirement() {
  const requirement = {
    requirement: document.getElementById("reqText").value,
    responsible: document.getElementById("reqResponsible").value,
    type: document.querySelector('input[name="reqType"]:checked').value,
    requirementText: document.getElementById("reqText").value,
    priority: document.getElementById("reqPriority").value || "-",
  };

  if (!requirement.requirement || !requirement.responsible) {
    alert("لطفا فیلدهای الزامی را پر کنید.");
    return;
  }

  if (requirement.type === "want" && !requirement.priority) {
    alert("برای خواسته، میزان اهمیت الزامی است.");
    return;
  }

  try {
    const response = await fetch("/api/requirements", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requirement),
    });

    if (response.ok) {
      const newReq = await response.json();
      currentRequirements.push(newReq);
      renderRequirementsTable();
      closeAddModal();
      updatePageNumbers();

      // به روز رسانی تعداد صفحات
      const totalPages = Math.ceil(currentRequirements.length / 15) || 1;
      document.getElementById("totalPages").value = totalPages;
    }
  } catch (error) {
    console.error("Error adding requirement:", error);
    alert("خطا در اضافه کردن الزام.");
  }
}

// ویرایش الزام
function editRequirement(id) {
  const requirement = currentRequirements.find((r) => r.id === id);
  if (!requirement) return;

  currentEditingId = id;

  const editModalBody = document.getElementById("editModalBody");
  editModalBody.innerHTML = `
        <div class="form-group">
            <label for="editReqText">الزامات</label>
            <textarea id="editReqText" rows="4" class="form-control">${
              requirement.requirement
            }</textarea>
        </div>
        
        <div class="form-group">
            <label for="editReqResponsible">مسئول / منبع</label>
            <input type="text" id="editReqResponsible" class="form-control" value="${
              requirement.responsible
            }">
        </div>
        
        <div class="form-group">
            <label>نوع</label>
            <div class="radio-group">
                <label>
                    <input type="radio" name="editReqType" value="need" ${
                      requirement.type === "need" ? "checked" : ""
                    }>
                    نیاز
                </label>
                <label>
                    <input type="radio" name="editReqType" value="want" ${
                      requirement.type === "want" ? "checked" : ""
                    }>
                    خواسته
                </label>
            </div>
        </div>
        
        <div class="form-group" id="editPriorityField" ${
          requirement.type === "need" ? 'style="display: none;"' : ""
        }>
            <label for="editReqPriority">میزان اهمیت</label>
            <select id="editReqPriority" class="form-control">
                <option value="بسیار بالا" ${
                  requirement.priority === "بسیار بالا" ? "selected" : ""
                }>بسیار بالا</option>
                <option value="بالا" ${
                  requirement.priority === "بالا" ? "selected" : ""
                }>بالا</option>
                <option value="متوسط" ${
                  requirement.priority === "متوسط" ? "selected" : ""
                }>متوسط</option>
                <option value="پایین" ${
                  requirement.priority === "پایین" ? "selected" : ""
                }>پایین</option>
                <option value="بسیار پایین" ${
                  requirement.priority === "بسیار پایین" ? "selected" : ""
                }>بسیار پایین</option>
            </select>
        </div>
        
        <div class="modal-footer">
            <button class="btn cancel-btn" onclick="closeEditModal()">لغو</button>
            <button class="btn submit-btn" onclick="updateRequirement()">ذخیره تغییرات</button>
        </div>
    `;

  // اضافه کردن رویداد برای تغییر نوع
  const radioButtons = editModalBody.querySelectorAll(
    'input[name="editReqType"]'
  );
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", function () {
      const priorityField = document.getElementById("editPriorityField");
      if (this.value === "want") {
        priorityField.style.display = "block";
      } else {
        priorityField.style.display = "none";
      }
    });
  });

  document.getElementById("editRequirementModal").style.display = "block";
}

// بستن مودال ویرایش
function closeEditModal() {
  document.getElementById("editRequirementModal").style.display = "none";
  currentEditingId = null;
}

// به روز رسانی الزام
async function updateRequirement() {
  if (!currentEditingId) return;

  const updates = {
    requirement: document.getElementById("editReqText").value,
    responsible: document.getElementById("editReqResponsible").value,
    type: document.querySelector('input[name="editReqType"]:checked').value,
    requirementText: document.getElementById("editReqText").value,
    priority: document.getElementById("editReqPriority").value || "-",
  };

  if (!updates.requirement || !updates.responsible) {
    alert("لطفا فیلدهای الزامی را پر کنید.");
    return;
  }

  if (updates.type === "want" && !updates.priority) {
    alert("برای خواسته، میزان اهمیت الزامی است.");
    return;
  }

  try {
    const response = await fetch(`/api/requirements/${currentEditingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    if (response.ok) {
      const updatedReq = await response.json();
      const index = currentRequirements.findIndex(
        (r) => r.id === currentEditingId
      );
      if (index !== -1) {
        currentRequirements[index] = updatedReq;
        renderRequirementsTable();
        closeEditModal();

        // به روز رسانی تاریخ آخرین تغییر سند
        document.getElementById("lastChangeDate").value = updatedReq.lastChange;
      }
    }
  } catch (error) {
    console.error("Error updating requirement:", error);
    alert("خطا در به روز رسانی الزام.");
  }
}

// حذف الزام
async function deleteRequirement(id) {
  if (!confirm("آیا مطمئن هستید که می‌خواهید این الزام را حذف کنید؟")) {
    return;
  }

  try {
    const response = await fetch(`/api/requirements/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      currentRequirements = currentRequirements.filter((r) => r.id !== id);
      renderRequirementsTable();
      updatePageNumbers();

      // به روز رسانی تعداد صفحات
      const totalPages = Math.ceil(currentRequirements.length / 15) || 1;
      document.getElementById("totalPages").value = totalPages;
    }
  } catch (error) {
    console.error("Error deleting requirement:", error);
    alert("خطا در حذف الزام.");
  }
}

// تنظیم رویدادها
function setupEventListeners() {
  // رویداد تغییر برای شماره صفحه و تعداد صفحات
  document
    .getElementById("pageNumber")
    .addEventListener("change", updatePageNumbers);
  document
    .getElementById("totalPages")
    .addEventListener("change", updatePageNumbers);

  // رویداد تغییر برای اطلاعات سازمان
  document
    .getElementById("organization")
    .addEventListener("input", updatePageNumbers);

  // بستن مودال با کلیک خارج از آن
  window.addEventListener("click", function (event) {
    const addModal = document.getElementById("addRequirementModal");
    const editModal = document.getElementById("editRequirementModal");

    if (event.target === addModal) {
      closeAddModal();
    }

    if (event.target === editModal) {
      closeEditModal();
    }
  });

  // ذخیره خودکار اطلاعات سند هنگام تغییر
  const saveableFields = [
    "projectName",
    "organization",
    "department",
    "issueDate",
    "version",
  ];
  saveableFields.forEach((fieldId) => {
    document.getElementById(fieldId).addEventListener("change", function () {
      // ذخیره با تاخیر برای جلوگیری از درخواست‌های مکرر
      clearTimeout(window.saveTimeout);
      window.saveTimeout = setTimeout(saveDocument, 1000);
    });
  });
}
