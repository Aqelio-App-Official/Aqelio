/* =========================================================
   AQELIO
   Phase 1 — Complete App.js
   Tasks • Editing • Recurring Tasks • Categories
   Reminders • Notifications • Calendar • Focus • Stats

   UPDATED:
   - Every week / Every other week / Every 3rd week / Every 4th week
   - Weekly weekday selection
   - Recurring tasks correctly appear on Home
   - Recurring completion tracked by occurrence date
   - Category color picker only when creating category
   - Category delete button integrated into category card
   - Subtle category delete controls
   ========================================================= */


/* =========================================================
   STORAGE
   ========================================================= */

const TASKS_KEY = "aqelio_tasks";
const CATEGORIES_KEY = "aqelio_categories";
const STATS_KEY = "aqelio_stats";
const FIRED_REMINDERS_KEY = "aqelio_fired_reminders";


let tasks = JSON.parse(
    localStorage.getItem(TASKS_KEY) || "[]"
);

let categories = JSON.parse(
    localStorage.getItem(CATEGORIES_KEY) || "[]"
);

let stats = JSON.parse(
    localStorage.getItem(STATS_KEY) ||
    '{"completed":0,"focus":0,"minutes":0}'
);

let firedReminders = JSON.parse(
    localStorage.getItem(FIRED_REMINDERS_KEY) || "[]"
);


/* =========================================================
   DEFAULT CATEGORIES
   ========================================================= */

if (categories.length === 0) {

    categories = [
        {
            id: "school",
            name: "School",
            color: "#4f7cff"
        },
        {
            id: "personal",
            name: "Personal",
            color: "#8a63d2"
        },
        {
            id: "work",
            name: "Work",
            color: "#e18a45"
        }
    ];

    saveCategories();
}


/* =========================================================
   DOM
   ========================================================= */

const screens = {
    home: document.getElementById("home-screen"),
    calendar: document.getElementById("calendar-screen"),
    focus: document.getElementById("focus-screen"),
    stats: document.getElementById("stats-screen")
};


const navHome =
    document.getElementById("nav-home");

const navCalendar =
    document.getElementById("nav-calendar");

const navFocus =
    document.getElementById("nav-focus");

const navStats =
    document.getElementById("nav-stats");


const taskModal =
    document.getElementById("task-modal");

const modalOverlay =
    document.getElementById("modal-overlay");


const taskTitle =
    document.getElementById("task-title");

const taskDate =
    document.getElementById("task-date");

const taskTime =
    document.getElementById("task-time");

const taskReminder =
    document.getElementById("task-reminder");

const taskRepeat =
    document.getElementById("task-repeat");


const saveTaskButton =
    document.getElementById("save-task");


const modalTitle =
    document.getElementById("modal-title");

const modalEyebrow =
    document.getElementById("modal-eyebrow");


const categoryList =
    document.getElementById("category-list");

const categoryName =
    document.getElementById("category-name");

const categoryForm =
    document.getElementById("category-form");


const customDuration =
    document.getElementById("custom-duration");


let selectedCategory = null;

let selectedDuration = 25;

let editingTaskId = null;

let selectedCalendarDate =
    formatDate(new Date());

let calendarDate =
    new Date();


/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatDate(date) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function parseDate(dateString) {

    const [year, month, day] =
        dateString.split("-").map(Number);

    return new Date(
        year,
        month - 1,
        day
    );
}


/*
   UTC date math avoids daylight-saving-time
   problems when calculating weekly intervals.
*/

function dateToUTC(dateString) {

    const [year, month, day] =
        dateString.split("-").map(Number);

    return Date.UTC(
        year,
        month - 1,
        day
    );
}


function daysBetween(
    startDate,
    endDate
) {

    return Math.round(
        (
            dateToUTC(endDate) -
            dateToUTC(startDate)
        ) /
        86400000
    );
}


/* =========================================================
   STORAGE FUNCTIONS
   ========================================================= */

function saveTasks() {

    localStorage.setItem(
        TASKS_KEY,
        JSON.stringify(tasks)
    );
}


function saveCategories() {

    localStorage.setItem(
        CATEGORIES_KEY,
        JSON.stringify(categories)
    );
}


function saveStats() {

    localStorage.setItem(
        STATS_KEY,
        JSON.stringify(stats)
    );
}


function saveFiredReminders() {

    localStorage.setItem(
        FIRED_REMINDERS_KEY,
        JSON.stringify(firedReminders)
    );
}


/* =========================================================
   ID
   ========================================================= */

function createId() {

    return (
        Date.now().toString() +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );
}


/* =========================================================
   SCREEN NAVIGATION
   ========================================================= */

function showScreen(name) {

    Object.values(screens).forEach(
        screen => {

            if (screen) {

                screen.classList.remove(
                    "active"
                );

            }

        }
    );


    [
        navHome,
        navCalendar,
        navFocus,
        navStats
    ].forEach(
        button => {

            if (button) {

                button.classList.remove(
                    "active"
                );

            }

        }
    );


    if (screens[name]) {

        screens[name].classList.add(
            "active"
        );

    }


    if (name === "home") {

        navHome.classList.add("active");

        renderHome();

    }


    if (name === "calendar") {

        navCalendar.classList.add("active");

        renderCalendar();

    }


    if (name === "focus") {

        navFocus.classList.add("active");

    }


    if (name === "stats") {

        navStats.classList.add("active");

        renderStats();

    }

}


navHome.addEventListener(
    "click",
    () => showScreen("home")
);


navCalendar.addEventListener(
    "click",
    () => showScreen("calendar")
);


navFocus.addEventListener(
    "click",
    () => showScreen("focus")
);


navStats.addEventListener(
    "click",
    () => showScreen("stats")
);


/* =========================================================
   CURRENT DATE
   ========================================================= */

function renderCurrentDate() {

    const element =
        document.getElementById(
            "current-date"
        );


    if (!element) {

        return;

    }


    element.textContent =
        new Date().toLocaleDateString(
            undefined,
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );
}


/* =========================================================
   REPEAT SYSTEM
   ========================================================= */

/*
   New weekly system:

   Every week
   Every other week
   Every 3rd week
   Every 4th week

   On:
   Sunday
   Monday
   Tuesday
   Wednesday
   Thursday
   Friday
   Saturday
*/


function setupRepeatUI() {

    if (!taskRepeat) {

        return;

    }


    /*
       Keep the original select in the HTML
       for compatibility, but use it as the
       repeat-type selector.
    */

    taskRepeat.classList.add(
        "aqelio-repeat-type-select"
    );


    let controls =
        document.getElementById(
            "repeat-custom-controls"
        );


    if (!controls) {

        controls =
            document.createElement("div");

        controls.id =
            "repeat-custom-controls";

        controls.className =
            "repeat-custom-controls";


        taskRepeat.parentNode.insertBefore(
            controls,
            taskRepeat.nextSibling
        );

    }


    controls.innerHTML = `

        <div class="repeat-schedule-row">

            <span class="repeat-prefix">
                Every
            </span>

            <select
                id="repeat-interval"
                class="repeat-control-select"
            >

                <option value="1">
                    Every week
                </option>

                <option value="2">
                    Every other week
                </option>

                <option value="3">
                    Every 3rd week
                </option>

                <option value="4">
                    Every 4th week
                </option>

            </select>

            <span class="repeat-prefix repeat-on">
                on
            </span>

            <select
                id="repeat-day"
                class="repeat-control-select repeat-day-select"
            >

                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>

            </select>

        </div>

    `;


    const intervalSelect =
        document.getElementById(
            "repeat-interval"
        );


    const daySelect =
        document.getElementById(
            "repeat-day"
        );


    intervalSelect.addEventListener(
        "change",
        () => {

            updateRepeatControls();

        }
    );


    daySelect.addEventListener(
        "change",
        () => {

            updateRepeatControls();

        }
    );


    taskRepeat.addEventListener(
        "change",
        () => {

            updateRepeatControls();

        }
    );


    updateRepeatControls();
}


function updateRepeatControls() {

    const controls =
        document.getElementById(
            "repeat-custom-controls"
        );


    if (!controls || !taskRepeat) {

        return;

    }


    const isWeekly =
        taskRepeat.value === "weekly";


    controls.classList.toggle(
        "visible",
        isWeekly
    );

}


function setRepeatValues(
    repeat,
    repeatInterval,
    repeatDay,
    taskDateValue
) {

    if (!taskRepeat) {

        return;

    }


    taskRepeat.value =
        repeat || "none";


    const intervalSelect =
        document.getElementById(
            "repeat-interval"
        );


    const daySelect =
        document.getElementById(
            "repeat-day"
        );


    const safeDate =
        taskDateValue ||
        formatDate(new Date());


    const defaultDay =
        parseDate(
            safeDate
        ).getDay();


    if (intervalSelect) {

        const interval =
            Number(
                repeatInterval || 1
            );


        intervalSelect.value =
            [1, 2, 3, 4].includes(interval)
                ? String(interval)
                : "1";

    }


    if (daySelect) {

        const day =
            repeatDay !== undefined &&
            repeatDay !== null
                ? Number(repeatDay)
                : defaultDay;


        daySelect.value =
            String(
                Number.isInteger(day)
                    ? day
                    : defaultDay
            );

    }


    updateRepeatControls();
}


function getRepeatSettings() {

    const repeat =
        taskRepeat
            ? taskRepeat.value
            : "none";


    const intervalSelect =
        document.getElementById(
            "repeat-interval"
        );


    const daySelect =
        document.getElementById(
            "repeat-day"
        );


    let repeatInterval =
        Number(
            intervalSelect?.value || 1
        );


    let repeatDay =
        Number(
            daySelect?.value ??
            parseDate(
                taskDate.value ||
                formatDate(new Date())
            ).getDay()
        );


    if (
        ![1, 2, 3, 4].includes(
            repeatInterval
        )
    ) {

        repeatInterval = 1;

    }


    if (
        ![0, 1, 2, 3, 4, 5, 6].includes(
            repeatDay
        )
    ) {

        repeatDay =
            parseDate(
                taskDate.value ||
                formatDate(new Date())
            ).getDay();

    }


    return {
        repeat,
        repeatInterval,
        repeatDay
    };
}


/* =========================================================
   RECURRING TASK LOGIC
   ========================================================= */

function taskOccursOnDate(
    task,
    dateString
) {

    if (!task || !task.date) {

        return false;

    }


    const taskDate =
        parseDate(task.date);

    const targetDate =
        parseDate(dateString);


    if (targetDate < taskDate) {

        return false;

    }


    const repeat =
        task.repeat || "none";


    /*
       One-time task
    */

    if (repeat === "none") {

        return (
            task.date ===
            dateString
        );

    }


    /*
       Every day
    */

    if (repeat === "daily") {

        return true;

    }


    /*
       Monday-Friday
    */

    if (repeat === "weekdays") {

        const day =
            targetDate.getDay();

        return (
            day !== 0 &&
            day !== 6
        );

    }


    /*
       Monthly
    */

    if (repeat === "monthly") {

        return (
            targetDate.getDate() ===
            taskDate.getDate()
        );

    }


    /*
       Weekly custom system
    */

    if (repeat === "weekly") {

        const repeatInterval =
            Math.min(
                4,
                Math.max(
                    1,
                    Number(
                        task.repeatInterval || 1
                    )
                )
            );


        const repeatDay =
            task.repeatDay !== undefined &&
            task.repeatDay !== null
                ? Number(task.repeatDay)
                : taskDate.getDay();


        /*
           Must be the selected weekday.
        */

        if (
            targetDate.getDay() !==
            repeatDay
        ) {

            return false;

        }


        const difference =
            daysBetween(
                task.date,
                dateString
            );


        if (difference < 0) {

            return false;

        }


        /*
           A weekly recurrence is based on
           calendar weeks from the original
           task date.

           1 = every week
           2 = every other week
           3 = every 3rd week
           4 = every 4th week
        */

        const weeksSinceStart =
            Math.floor(
                difference / 7
            );


        return (
            weeksSinceStart %
            repeatInterval ===
            0
        );

    }


    /*
       Backwards compatibility with any
       previous recurring data.
    */

    if (
        repeat === "weekly-old"
    ) {

        return (
            targetDate.getDay() ===
            taskDate.getDay()
        );

    }


    return false;
}


/* =========================================================
   TASKS FOR DATE
   ========================================================= */

function getTasksForDate(
    dateString
) {

    return tasks
        .filter(
            task =>
                taskOccursOnDate(
                    task,
                    dateString
                )
        )
        .sort(
            (a, b) => {

                if (!a.time && !b.time) {

                    return 0;

                }

                if (!a.time) {

                    return 1;

                }

                if (!b.time) {

                    return -1;

                }

                return a.time.localeCompare(
                    b.time
                );

            }
        );
}


/* =========================================================
   CATEGORY
   ========================================================= */

function getCategory(
    categoryId
) {

    return categories.find(
        category =>
            category.id === categoryId
    );
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


/* =========================================================
   TIME
   ========================================================= */

function formatTime(
    time
) {

    if (!time) {

        return "";

    }


    const [hourString, minute] =
        time.split(":");


    let hour =
        Number(hourString);


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 || 12;


    return `${hour}:${minute} ${suffix}`;
}


/* =========================================================
   REPEAT TEXT
   ========================================================= */

function formatRepeat(
    task
) {

    if (!task) {

        return "";

    }


    const repeat =
        task.repeat || "none";


    if (repeat === "daily") {

        return "Daily";

    }


    if (repeat === "weekdays") {

        return "Weekdays";

    }


    if (repeat === "monthly") {

        return "Monthly";

    }


    if (repeat === "weekly") {

        const interval =
            Number(
                task.repeatInterval || 1
            );


        const intervalText = {

            1: "Every week",

            2: "Every other week",

            3: "Every 3rd week",

            4: "Every 4th week"

        }[interval] || "Every week";


        const day =
            task.repeatDay !== undefined &&
            task.repeatDay !== null
                ? Number(task.repeatDay)
                : parseDate(
                    task.date
                ).getDay();


        const dayName =
            [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday"
            ][day];


        return `${intervalText} on ${dayName}`;

    }


    return "";
}


/* =========================================================
   COMPLETION SYSTEM
   ========================================================= */

function isRecurringTask(
    task
) {

    return (
        task.repeat &&
        task.repeat !== "none"
    );

}


function isTaskCompletedForDate(
    task,
    displayDate
) {

    /*
       Recurring tasks use individual
       completion dates.
    */

    if (isRecurringTask(task)) {

        if (
            !Array.isArray(
                task.completedDates
            )
        ) {

            task.completedDates = [];

        }


        return task.completedDates.includes(
            displayDate
        );

    }


    return Boolean(
        task.completed
    );
}


/* =========================================================
   TASK CARD
   ========================================================= */

function createTaskCard(
    task,
    displayDate
) {

    const card =
        document.createElement("article");


    const completed =
        isTaskCompletedForDate(
            task,
            displayDate
        );


    card.className =
        "task-card" +
        (
            completed
                ? " completed"
                : ""
        );


    const category =
        getCategory(
            task.categoryId
        );


    const categoryColor =
        category?.color ||
        "#078b91";


    const categoryNameText =
        category?.name ||
        "Personal";


    const repeatText =
        formatRepeat(task);


    card.innerHTML = `

        <button
            class="task-check"
            type="button"
            aria-label="Complete task"
        >
            ${completed ? "✓" : ""}
        </button>


        <div class="task-main">

            <h3>
                ${escapeHtml(task.title)}
            </h3>


            <div class="task-meta">

                <span
                    class="task-category"
                    style="--category-color:${escapeHtml(categoryColor)}"
                >
                    ${escapeHtml(categoryNameText)}
                </span>


                ${
                    task.time
                        ? `
                            <span>
                                • ${formatTime(task.time)}
                            </span>
                        `
                        : ""
                }


                <span>
                    • ${task.duration || 25} min
                </span>


                ${
                    repeatText
                        ? `
                            <span>
                                • ↻ ${escapeHtml(repeatText)}
                            </span>
                        `
                        : ""
                }


                ${
                    task.reminder &&
                    task.reminder !== "none"
                        ? `
                            <span>
                                • 🔔
                            </span>
                        `
                        : ""
                }

            </div>

        </div>


        <div class="task-actions">

            <button
                class="task-focus-trigger"
                type="button"
            >
                Focus
            </button>


            <button
                class="task-edit-trigger"
                type="button"
            >
                Edit
            </button>


            <button
                class="task-delete-trigger"
                type="button"
                aria-label="Delete task"
            >
                ×
            </button>

        </div>

    `;


    card.querySelector(
        ".task-check"
    ).addEventListener(
        "click",
        () =>
            toggleTask(
                task.id,
                displayDate
            )
    );


    card.querySelector(
        ".task-edit-trigger"
    ).addEventListener(
        "click",
        () =>
            openEditTask(
                task.id
            )
    );


    card.querySelector(
        ".task-delete-trigger"
    ).addEventListener(
        "click",
        () =>
            deleteTask(
                task.id
            )
    );


    card.querySelector(
        ".task-focus-trigger"
    ).addEventListener(
        "click",
        () =>
            startFocusForTask(
                task
            )
    );


    return card;
}


/* =========================================================
   HOME
   ========================================================= */

function renderHome() {

    renderCurrentDate();


    const today =
        formatDate(new Date());


    const list =
        document.getElementById(
            "task-list"
        );


    if (!list) {

        return;

    }


    list.innerHTML = "";


    /*
       IMPORTANT:
       This uses getTasksForDate(today),
       which now understands the new weekly
       recurrence system.
    */

    const todayTasks =
        getTasksForDate(today);


    if (todayTasks.length === 0) {

        list.innerHTML = `

            <div class="empty-state">

                <h3>
                    Nothing scheduled today
                </h3>

                <p>
                    Add a task to get your day started.
                </p>

            </div>

        `;

    } else {

        todayTasks.forEach(
            task => {

                list.appendChild(
                    createTaskCard(
                        task,
                        today
                    )
                );

            }
        );

    }


    updateProgress(
        todayTasks,
        today
    );
}


/* =========================================================
   PROGRESS
   ========================================================= */

function updateProgress(
    todayTasks,
    displayDate
) {

    const total =
        todayTasks.length;


    const completed =
        todayTasks.filter(
            task =>
                isTaskCompletedForDate(
                    task,
                    displayDate
                )
        ).length;


    const percentage =
        total === 0
            ? 0
            : Math.round(
                completed /
                total *
                100
            );


    const progressText =
        document.getElementById(
            "progress-text"
        );


    const progressPercent =
        document.getElementById(
            "progress-percent"
        );


    const progressFill =
        document.getElementById(
            "progress-fill"
        );


    if (progressText) {

        progressText.textContent =
            `${completed} of ${total} tasks completed`;

    }


    if (progressPercent) {

        progressPercent.textContent =
            `${percentage}%`;

    }


    if (progressFill) {

        progressFill.style.width =
            `${percentage}%`;

    }
}


/* =========================================================
   COMPLETE TASK
   ========================================================= */

function toggleTask(
    taskId,
    displayDate
) {

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );


    if (!task) {

        return;

    }


    const currentlyCompleted =
        isTaskCompletedForDate(
            task,
            displayDate
        );


    if (isRecurringTask(task)) {

        if (
            !Array.isArray(
                task.completedDates
            )
        ) {

            task.completedDates = [];

        }


        if (currentlyCompleted) {

            task.completedDates =
                task.completedDates.filter(
                    date =>
                        date !== displayDate
                );

            stats.completed =
                Math.max(
                    0,
                    stats.completed - 1
                );

        } else {

            task.completedDates.push(
                displayDate
            );

            stats.completed++;

        }

    } else {

        task.completed =
            !currentlyCompleted;


        if (task.completed) {

            stats.completed++;

        } else {

            stats.completed =
                Math.max(
                    0,
                    stats.completed - 1
                );

        }

    }


    saveTasks();

    saveStats();


    renderHome();

    renderCalendar();

    renderStats();
}


/* =========================================================
   DELETE / UNDO
   ========================================================= */

let deletedTaskBackup = null;

let undoTimeout = null;


function deleteTask(
    taskId
) {

    const index =
        tasks.findIndex(
            task =>
                task.id === taskId
        );


    if (index === -1) {

        return;

    }


    deletedTaskBackup = {

        task:
            structuredClone
                ? structuredClone(
                    tasks[index]
                )
                : JSON.parse(
                    JSON.stringify(
                        tasks[index]
                    )
                ),

        index

    };


    tasks.splice(
        index,
        1
    );


    saveTasks();


    renderHome();

    renderCalendar();


    showUndoToast();


    clearTimeout(
        undoTimeout
    );


    undoTimeout =
        setTimeout(
            () => {

                deletedTaskBackup =
                    null;

            },
            10000
        );
}


function showUndoToast() {

    const existing =
        document.getElementById(
            "aqelio-undo-toast"
        );


    if (existing) {

        existing.remove();

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.id =
        "aqelio-undo-toast";


    toast.innerHTML = `

        <span>
            Task deleted
        </span>

        <button
            type="button"
            id="aqelio-undo-button"
        >
            Undo
        </button>

    `;


    Object.assign(
        toast.style,
        {
            position: "fixed",
            left: "50%",
            bottom: "96px",
            transform: "translateX(-50%)",
            zIndex: "99998",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "12px 16px",
            borderRadius: "14px",
            background: "#202c31",
            color: "#ffffff",
            boxShadow:
                "0 12px 30px rgba(0,0,0,0.18)",
            fontSize: "14px",
            fontWeight: "600"
        }
    );


    const undoButton =
        toast.querySelector(
            "#aqelio-undo-button"
        );


    Object.assign(
        undoButton.style,
        {
            border: "none",
            background: "transparent",
            color: "#71d5d9",
            fontWeight: "700",
            cursor: "pointer",
            padding: "2px 4px"
        }
    );


    undoButton.addEventListener(
        "click",
        undoDelete
    );


    document.body.appendChild(
        toast
    );


    setTimeout(
        () => {

            if (
                toast.parentNode
            ) {

                toast.remove();

            }

        },
        10000
    );
}


function undoDelete() {

    if (!deletedTaskBackup) {

        return;

    }


    tasks.splice(
        deletedTaskBackup.index,
        0,
        deletedTaskBackup.task
    );


    saveTasks();


    clearTimeout(
        undoTimeout
    );


    deletedTaskBackup =
        null;


    const toast =
        document.getElementById(
            "aqelio-undo-toast"
        );


    if (toast) {

        toast.remove();

    }


    renderHome();

    renderCalendar();

}


/* =========================================================
   MODAL — ADD
   ========================================================= */

function openAddTask(
    dateOverride = null
) {

    editingTaskId =
        null;


    if (modalTitle) {

        modalTitle.textContent =
            "Add a task";

    }


    if (modalEyebrow) {

        modalEyebrow.textContent =
            "NEW TASK";

    }


    saveTaskButton.textContent =
        "Add Task";


    taskTitle.value =
        "";


    taskDate.value =
        dateOverride ||
        selectedCalendarDate ||
        formatDate(new Date());


    taskTime.value =
        "";


    taskReminder.value =
        "none";


    selectedCategory =
        categories[0]?.id ||
        null;


    selectedDuration =
        25;


    customDuration.value =
        "";


    setRepeatValues(
        "none",
        1,
        parseDate(
            taskDate.value
        ).getDay(),
        taskDate.value
    );


    updateDurationButtons();

    renderCategories();


    closeCategoryForm();


    taskModal.classList.add(
        "active"
    );
}


/* =========================================================
   MODAL — EDIT
   ========================================================= */

function openEditTask(
    taskId
) {

    const task =
        tasks.find(
            item =>
                item.id === taskId
        );


    if (!task) {

        return;

    }


    editingTaskId =
        taskId;


    if (modalTitle) {

        modalTitle.textContent =
            "Edit task";

    }


    if (modalEyebrow) {

        modalEyebrow.textContent =
            "EDIT TASK";

    }


    saveTaskButton.textContent =
        "Save Changes";


    taskTitle.value =
        task.title || "";


    taskDate.value =
        task.date ||
        formatDate(new Date());


    taskTime.value =
        task.time || "";


    taskReminder.value =
        task.reminder ||
        "none";


    selectedCategory =
        task.categoryId ||
        categories[0]?.id ||
        null;


    selectedDuration =
        Number(
            task.duration || 25
        );


    if (
        ![15, 25, 45, 60].includes(
            selectedDuration
        )
    ) {

        customDuration.value =
            selectedDuration;

    } else {

        customDuration.value =
            "";

    }


    setRepeatValues(
        task.repeat || "none",
        task.repeatInterval || 1,
        task.repeatDay,
        task.date
    );


    updateDurationButtons();

    renderCategories();

    closeCategoryForm();


    taskModal.classList.add(
        "active"
    );
}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

    taskModal.classList.remove(
        "active"
    );


    editingTaskId =
        null;


    closeCategoryForm();
}


document.getElementById(
    "close-modal"
).addEventListener(
    "click",
    closeModal
);


modalOverlay.addEventListener(
    "click",
    closeModal
);


/* =========================================================
   SAVE TASK
   ========================================================= */

saveTaskButton.addEventListener(
    "click",
    saveTask
);


function saveTask() {

    const title =
        taskTitle.value.trim();


    if (!title) {

        taskTitle.focus();

        return;

    }


    const date =
        taskDate.value ||
        formatDate(new Date());


    const time =
        taskTime.value;


    const reminder =
        taskReminder.value;


    const repeatSettings =
        getRepeatSettings();


    let duration =
        selectedDuration;


    if (
        customDuration.value
    ) {

        duration =
            Number(
                customDuration.value
            );

    }


    if (
        !duration ||
        duration < 1
    ) {

        duration = 25;

    }


    if (editingTaskId) {

        const task =
            tasks.find(
                item =>
                    item.id ===
                    editingTaskId
            );


        if (!task) {

            return;

        }


        const wasRecurring =
            isRecurringTask(task);


        const wasCompleted =
            isTaskCompletedForDate(
                task,
                task.date ||
                date
            );


        task.title =
            title;


        task.date =
            date;


        task.time =
            time;


        task.reminder =
            reminder;


        task.repeat =
            repeatSettings.repeat;


        task.repeatInterval =
            repeatSettings.repeatInterval;


        task.repeatDay =
            repeatSettings.repeatDay;


        task.categoryId =
            selectedCategory;


        task.duration =
            duration;


        /*
           Preserve recurring completion data.
        */

        if (
            repeatSettings.repeat !==
            "none"
        ) {

            if (
                !Array.isArray(
                    task.completedDates
                )
            ) {

                task.completedDates = [];

            }


            /*
               If an old one-time task was
               already completed and is now
               made recurring, carry that
               completion into its current date.
            */

            if (
                !wasRecurring &&
                wasCompleted &&
                !task.completedDates.includes(
                    date
                )
            ) {

                task.completedDates.push(
                    date
                );

            }


        } else {

            /*
               If a recurring task is converted
               to a normal task, use its current
               occurrence completion state.
            */

            task.completed =
                wasRecurring
                    ? isTaskCompletedForDate(
                        task,
                        date
                    )
                    : Boolean(
                        task.completed
                    );

        }


        /*
           Clear old reminder records so
           edited reminders can fire again.
        */

        firedReminders =
            firedReminders.filter(
                key =>
                    !key.startsWith(
                        `${task.id}-`
                    )
            );

    } else {

        tasks.push({

            id:
                createId(),

            title,

            date,

            time,

            reminder,

            repeat:
                repeatSettings.repeat,

            repeatInterval:
                repeatSettings.repeatInterval,

            repeatDay:
                repeatSettings.repeatDay,

            categoryId:
                selectedCategory,

            duration,

            completed:
                false,

            completedDates:
                [],

            createdAt:
                Date.now()

        });

    }


    saveTasks();

    saveFiredReminders();


    closeModal();


    renderHome();

    renderCalendar();


    checkReminders();
}


/* =========================================================
   ADD BUTTONS
   ========================================================= */

document.getElementById(
    "add-task-top"
).addEventListener(
    "click",
    () =>
        openAddTask(
            formatDate(
                new Date()
            )
        )
);


document.getElementById(
    "add-task-main"
).addEventListener(
    "click",
    () =>
        openAddTask(
            selectedCalendarDate ||
            formatDate(new Date())
        )
);


document.getElementById(
    "add-task-calendar"
).addEventListener(
    "click",
    () =>
        openAddTask(
            selectedCalendarDate
        )
);


/* =========================================================
   CATEGORY COLOR PICKER
   ========================================================= */

function setupCategoryColorPicker() {

    if (!categoryForm) {

        return;

    }


    let picker =
        document.getElementById(
            "new-category-color"
        );


    if (!picker) {

        const colorRow =
            document.createElement(
                "div"
            );


        colorRow.className =
            "category-color-row";


        colorRow.innerHTML = `

            <label
                for="new-category-color"
            >
                Color
            </label>

            <div class="category-color-input-wrap">

                <input
                    id="new-category-color"
                    type="color"
                    value="#078b91"
                >

                <span
                    id="new-category-color-value"
                >
                    #078B91
                </span>

            </div>

        `;


        categoryForm.insertBefore(
            colorRow,
            categoryForm.querySelector(
                ".category-form-actions"
            )
        );


        picker =
            document.getElementById(
                "new-category-color"
            );


        picker.addEventListener(
            "input",
            () => {

                const value =
                    picker.value.toUpperCase();


                const valueText =
                    document.getElementById(
                        "new-category-color-value"
                    );


                if (valueText) {

                    valueText.textContent =
                        value;

                }

            }
        );

    }

}


function closeCategoryForm() {

    if (!categoryForm) {

        return;

    }


    categoryForm.classList.add(
        "hidden"
    );


    if (categoryName) {

        categoryName.value =
            "";

    }


    const picker =
        document.getElementById(
            "new-category-color"
        );


    if (picker) {

        picker.value =
            "#078b91";


        const valueText =
            document.getElementById(
                "new-category-color-value"
            );


        if (valueText) {

            valueText.textContent =
                "#078B91";

        }

    }

}


function openCategoryForm() {

    if (!categoryForm) {

        return;

    }


    categoryForm.classList.remove(
        "hidden"
    );


    setupCategoryColorPicker();


    const picker =
        document.getElementById(
            "new-category-color"
        );


    if (picker) {

        picker.value =
            getUnusedCategoryColor();

    }


    categoryName.focus();
}


/* =========================================================
   CATEGORY SYSTEM
   ========================================================= */

function renderCategories() {

    if (!categoryList) {

        return;

    }


    categoryList.innerHTML = "";


    if (categories.length === 0) {

        categoryList.innerHTML = `

            <div class="empty-category-state">
                No categories yet.
            </div>

        `;

        selectedCategory =
            null;

        return;

    }


    /*
       Make sure the selected category
       still exists.
    */

    if (
        !categories.some(
            category =>
                category.id ===
                selectedCategory
        )
    ) {

        selectedCategory =
            categories[0].id;

    }


    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "category-button" +
                (
                    selectedCategory ===
                    category.id
                        ? " selected"
                        : ""
                );


            button.innerHTML = `

                <span class="category-button-main">

                    <span
                        class="category-dot"
                        style="
                            background:${escapeHtml(
                                category.color
                            )}
                        "
                    ></span>

                    <span class="category-name-text">
                        ${escapeHtml(
                            category.name
                        )}
                    </span>

                </span>


                <span
                    class="category-delete"
                    role="button"
                    tabindex="0"
                    aria-label="Delete ${escapeHtml(
                        category.name
                    )} category"
                    title="Delete category"
                >
                    ×
                </span>

            `;


            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        category.id;

                    renderCategories();

                }
            );


            const deleteButton =
                button.querySelector(
                    ".category-delete"
                );


            deleteButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    event.stopPropagation();

                    deleteCategory(
                        category.id
                    );

                }
            );


            deleteButton.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter" ||
                        event.key ===
                        " "
                    ) {

                        event.preventDefault();

                        event.stopPropagation();

                        deleteCategory(
                            category.id
                        );

                    }

                }
            );


            categoryList.appendChild(
                button
            );

        }
    );
}


function deleteCategory(
    categoryId
) {

    const category =
        getCategory(categoryId);


    if (!category) {

        return;

    }


    const confirmed =
        window.confirm(
            `Delete the "${category.name}" category? Tasks using it will be moved to another category.`
        );


    if (!confirmed) {

        return;

    }


    const remainingCategories =
        categories.filter(
            item =>
                item.id !==
                categoryId
        );


    /*
       Choose a fallback category.
       Prefer Personal if it still exists.
    */

    const fallbackCategory =
        remainingCategories.find(
            item =>
                item.id === "personal"
        ) ||
        remainingCategories[0] ||
        null;


    tasks.forEach(
        task => {

            if (
                task.categoryId ===
                categoryId
            ) {

                task.categoryId =
                    fallbackCategory
                        ?.id ||
                    null;

            }

        }
    );


    categories =
        remainingCategories;


    selectedCategory =
        fallbackCategory
            ?.id ||
        null;


    saveCategories();

    saveTasks();


    renderCategories();

    renderHome();

    renderCalendar();

}


/* =========================================================
   CATEGORY BUTTONS
   ========================================================= */

setupCategoryColorPicker();


document.getElementById(
    "show-category-form"
).addEventListener(
    "click",
    openCategoryForm
);


document.getElementById(
    "cancel-category"
).addEventListener(
    "click",
    closeCategoryForm
);


/* =========================================================
   CATEGORY COLOR SYSTEM
   ========================================================= */

function getUnusedCategoryColor() {

    const colors = [

        "#078b91",
        "#4f7cff",
        "#8a63d2",
        "#e18a45",
        "#d65f7a",
        "#5e9b67",
        "#c6a23a",
        "#3f8fa8",
        "#a855a8",
        "#5c6bc0",
        "#d66b5d",
        "#6d8f9e"

    ];


    const usedColors =
        categories.map(
            category =>
                category.color
        );


    const unused =
        colors.find(
            color =>
                !usedColors.includes(
                    color
                )
        );


    if (unused) {

        return unused;

    }


    return generateUniqueColor();
}


function generateUniqueColor() {

    let color;

    let attempts = 0;


    do {

        const hue =
            Math.floor(
                Math.random() * 360
            );


        color =
            `hsl(${hue}, 65%, 52%)`;


        attempts++;

    } while (
        categories.some(
            category =>
                category.color ===
                color
        ) &&
        attempts < 100
    );


    return color;
}


/* =========================================================
   SAVE CATEGORY
   ========================================================= */

document.getElementById(
    "save-category"
).addEventListener(
    "click",
    () => {

        const name =
            categoryName.value.trim();


        if (!name) {

            categoryName.focus();

            return;

        }


        const picker =
            document.getElementById(
                "new-category-color"
            );


        const color =
            picker?.value ||
            getUnusedCategoryColor();


        const category = {

            id:
                createId(),

            name,

            color

        };


        categories.push(
            category
        );


        selectedCategory =
            category.id;


        saveCategories();


        closeCategoryForm();


        renderCategories();

    }
);


/* =========================================================
   DURATION
   ========================================================= */

document
    .querySelectorAll(
        ".duration-button"
    )
    .forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    selectedDuration =
                        Number(
                            button.dataset.duration
                        );


                    customDuration.value =
                        "";


                    updateDurationButtons();

                }
            );

        }
    );


function updateDurationButtons() {

    document
        .querySelectorAll(
            ".duration-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "selected",
                    Number(
                        button.dataset.duration
                    ) ===
                    Number(
                        selectedDuration
                    )
                );

            }
        );
}


/* =========================================================
   CALENDAR
   ========================================================= */

function renderCalendar() {

    const grid =
        document.getElementById(
            "calendar-grid"
        );


    if (!grid) {

        return;

    }


    grid.innerHTML = "";


    const year =
        calendarDate.getFullYear();


    const month =
        calendarDate.getMonth();


    const monthTitle =
        document.getElementById(
            "calendar-month"
        );


    if (monthTitle) {

        monthTitle.textContent =
            calendarDate.toLocaleDateString(
                undefined,
                {
                    month: "long",
                    year: "numeric"
                }
            );

    }


    const firstDay =
        new Date(
            year,
            month,
            1
        ).getDay();


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    const previousMonthDays =
        new Date(
            year,
            month,
            0
        ).getDate();


    for (
        let i = firstDay - 1;
        i >= 0;
        i--
    ) {

        const day =
            previousMonthDays - i;


        grid.appendChild(
            createCalendarDay(
                new Date(
                    year,
                    month - 1,
                    day
                ),
                true
            )
        );

    }


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        grid.appendChild(
            createCalendarDay(
                new Date(
                    year,
                    month,
                    day
                ),
                false
            )
        );

    }


    const totalCells =
        firstDay +
        daysInMonth;


    const remaining =
        totalCells % 7 === 0
            ? 0
            : 7 -
              (
                  totalCells % 7
              );


    for (
        let day = 1;
        day <= remaining;
        day++
    ) {

        grid.appendChild(
            createCalendarDay(
                new Date(
                    year,
                    month + 1,
                    day
                ),
                true
            )
        );

    }


    renderCalendarTasks();
}


function createCalendarDay(
    date,
    outside
) {

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "calendar-day";


    if (outside) {

        button.classList.add(
            "outside"
        );

    }


    const dateString =
        formatDate(date);


    if (
        dateString ===
        formatDate(new Date())
    ) {

        button.classList.add(
            "today"
        );

    }


    if (
        dateString ===
        selectedCalendarDate
    ) {

        button.classList.add(
            "selected"
        );

    }


    button.innerHTML = `

        <span
            class="calendar-day-number"
        >
            ${date.getDate()}
        </span>

    `;


    const dateTasks =
        getTasksForDate(
            dateString
        );


    if (dateTasks.length > 0) {

        const dot =
            document.createElement(
                "span"
            );


        dot.className =
            "calendar-task-dot";


        button.appendChild(
            dot
        );

    }


    if (!outside) {

        button.addEventListener(
            "click",
            () => {

                selectedCalendarDate =
                    dateString;

                renderCalendar();

            }
        );

    }


    return button;
}


document.getElementById(
    "previous-month"
).addEventListener(
    "click",
    () => {

        calendarDate =
            new Date(
                calendarDate.getFullYear(),
                calendarDate.getMonth() - 1,
                1
            );

        renderCalendar();

    }
);


document.getElementById(
    "next-month"
).addEventListener(
    "click",
    () => {

        calendarDate =
            new Date(
                calendarDate.getFullYear(),
                calendarDate.getMonth() + 1,
                1
            );

        renderCalendar();

    }
);


/* =========================================================
   CALENDAR TASK LIST
   ========================================================= */

function renderCalendarTasks() {

    const list =
        document.getElementById(
            "calendar-task-list"
        );


    const title =
        document.getElementById(
            "selected-date-title"
        );


    if (!list || !title) {

        return;

    }


    const date =
        parseDate(
            selectedCalendarDate
        );


    title.textContent =
        date.toLocaleDateString(
            undefined,
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );


    list.innerHTML = "";


    const dateTasks =
        getTasksForDate(
            selectedCalendarDate
        );


    if (dateTasks.length === 0) {

        list.innerHTML = `

            <div class="empty-state">

                <h3>
                    No tasks for this day
                </h3>

                <p>
                    Add a task to your calendar.
                </p>

            </div>

        `;

        return;

    }


    dateTasks.forEach(
        task => {

            list.appendChild(
                createTaskCard(
                    task,
                    selectedCalendarDate
                )
            );

        }
    );
}


/* =========================================================
   REMINDER / NOTIFICATION SYSTEM
   ========================================================= */

/* =========================================================
   REMINDERS
   ========================================================= */

const reminderTimers = new Map();

function showReminderCard(task) {
    // Remove an existing reminder card if one is already visible
    document.querySelector(".aqelio-reminder-card")?.remove();

    const card = document.createElement("div");
    card.className = "aqelio-reminder-card";

    card.innerHTML = `
        <div class="aqelio-reminder-icon">🔔</div>

        <div class="aqelio-reminder-content">
            <div class="aqelio-reminder-title">Aqelio Reminder</div>
            <div class="aqelio-reminder-task">${escapeHTML(task.title)}</div>
            <div class="aqelio-reminder-subtitle">It's time for this task.</div>
        </div>

        <button
            type="button"
            class="aqelio-reminder-close"
            aria-label="Dismiss reminder"
        >
            ×
        </button>
    `;

    document.body.appendChild(card);

    // Close button
    card.querySelector(".aqelio-reminder-close")?.addEventListener("click", () => {
        card.classList.remove("show");

        setTimeout(() => {
            card.remove();
        }, 250);
    });

    // Animate in
    requestAnimationFrame(() => {
        card.classList.add("show");
    });

    // Automatically disappear after 8 seconds
    setTimeout(() => {
        if (!card.isConnected) return;

        card.classList.remove("show");

        setTimeout(() => {
            card.remove();
        }, 250);
    }, 8000);
}

function scheduleReminder(task) {
    if (!task.reminder || task.completed) return;

    const when = new Date(task.reminder).getTime();
    const delay = when - Date.now();

    if (delay <= 0 || delay > 2147483647) return;

    if (reminderTimers.has(task.id)) {
        clearTimeout(reminderTimers.get(task.id));
    }

    const timer = setTimeout(() => {

        // Show Aqelio's own in-app reminder card
        showReminderCard(task);

        reminderTimers.delete(task.id);

    }, delay);

    reminderTimers.set(task.id, timer);
}

function scheduleAllReminders() {
    tasks.forEach(scheduleReminder);
}
/* =========================================================
   REMINDER SOUND
   ========================================================= */

function playReminderSound() {

    try {

        const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;


        if (!AudioContext) {

            return;

        }


        const context =
            new AudioContext();


        const oscillator =
            context.createOscillator();


        const gain =
            context.createGain();


        oscillator.type =
            "sine";


        oscillator.frequency.setValueAtTime(
            880,
            context.currentTime
        );


        oscillator.frequency.setValueAtTime(
            660,
            context.currentTime + 0.15
        );


        gain.gain.setValueAtTime(
            0.0001,
            context.currentTime
        );


        gain.gain.exponentialRampToValueAtTime(
            0.25,
            context.currentTime + 0.02
        );


        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.5
        );


        oscillator.connect(
            gain
        );


        gain.connect(
            context.destination
        );


        oscillator.start();


        oscillator.stop(
            context.currentTime + 0.5
        );

    } catch (error) {

        console.warn(
            "Could not play reminder sound:",
            error
        );

    }
}


/* =========================================================
   REMINDER KEY
   ========================================================= */

function getReminderKey(
    task,
    occurrenceDate,
    reminderTime
) {

    return [
        task.id,
        occurrenceDate,
        reminderTime
    ].join("-");

}


/* =========================================================
   REMINDER TIME
   ========================================================= */

function getReminderTime(
    task,
    occurrenceDate
) {

    if (
        !task.time ||
        !task.reminder ||
        task.reminder === "none"
    ) {

        return null;

    }


    const date =
        parseDate(
            occurrenceDate
        );


    const [hours, minutes] =
        task.time
            .split(":")
            .map(Number);


    date.setHours(
        hours,
        minutes,
        0,
        0
    );


    if (
        task.reminder ===
        "at-time"
    ) {

        return date;

    }


    const minutesBefore =
        Number(
            task.reminder
        );


    if (
        !Number.isNaN(
            minutesBefore
        )
    ) {

        date.setMinutes(
            date.getMinutes() -
            minutesBefore
        );

        return date;

    }


    return null;
}


/* =========================================================
   SEND REMINDER
   ========================================================= */

function sendReminderNotification(
    task,
    occurrenceDate
) {

    const reminderLabel =
        task.reminder ===
        "at-time"
            ? "It's time"
            : `${task.reminder} minutes before`;


    playReminderSound();


    if (
        "Notification" in window &&
        Notification.permission ===
            "granted"
    ) {

        try {

            const notification =
                new Notification(
                    "Aqelio Reminder",
                    {
                        body:
                            `${task.title} — ${reminderLabel}`,
                        icon:
                            "Aqelio.jpg",
                        tag:
                            `aqelio-${task.id}-${occurrenceDate}`
                    }
                );


            notification.onclick =
                () => {

                    window.focus();

                    showScreen(
                        "calendar"
                    );

                    selectedCalendarDate =
                        occurrenceDate;

                    renderCalendar();

                };

        } catch (error) {

            console.error(
                "Notification error:",
                error
            );

        }

    } else {

        showInAppReminder(
            task,
            reminderLabel
        );

    }
}


/* =========================================================
   IN-APP REMINDER
   ========================================================= */

function showInAppReminder(
    task,
    reminderLabel
) {

    const existing =
        document.getElementById(
            "aqelio-reminder-popup"
        );


    if (existing) {

        existing.remove();

    }


    const popup =
        document.createElement(
            "div"
        );


    popup.id =
        "aqelio-reminder-popup";


    popup.innerHTML = `

        <div class="aqelio-reminder-icon">
            🔔
        </div>

        <div class="aqelio-reminder-content">

            <strong>
                Aqelio Reminder
            </strong>

            <span>
                ${escapeHtml(task.title)}
            </span>

            <small>
                ${escapeHtml(reminderLabel)}
            </small>

        </div>

        <button
            type="button"
            aria-label="Close reminder"
        >
            ×
        </button>

    `;


    Object.assign(
        popup.style,
        {
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: "99999",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            maxWidth: "340px",
            borderRadius: "16px",
            background: "#ffffff",
            boxShadow:
                "0 12px 35px rgba(0,0,0,0.18)",
            border:
                "1px solid rgba(7,139,145,0.18)",
            fontFamily:
                "inherit"
        }
    );


    const closeButton =
        popup.querySelector(
            "button"
        );


    Object.assign(
        closeButton.style,
        {
            border: "none",
            background: "transparent",
            fontSize: "22px",
            cursor: "pointer",
            opacity: "0.6"
        }
    );


    closeButton.addEventListener(
        "click",
        () => popup.remove()
    );


    document.body.appendChild(
        popup
    );


    setTimeout(
        () => {

            if (
                popup.parentNode
            ) {

                popup.remove();

            }

        },
        10000
    );
}


/* =========================================================
   CHECK REMINDERS
   ========================================================= */

function checkReminders() {

    const now =
        new Date();


    const today =
        formatDate(now);


    const todayTasks =
        getTasksForDate(
            today
        );


    todayTasks.forEach(
        task => {

            if (
                !task.time ||
                !task.reminder ||
                task.reminder ===
                    "none"
            ) {

                return;

            }


            const reminderTime =
                getReminderTime(
                    task,
                    today
                );


            if (!reminderTime) {

                return;

            }


            const difference =
                now.getTime() -
                reminderTime.getTime();


            if (
                difference >= 0 &&
                difference < 60000
            ) {

                const key =
                    getReminderKey(
                        task,
                        today,
                        reminderTime.getTime()
                    );


                if (
                    !firedReminders.includes(
                        key
                    )
                ) {

                    firedReminders.push(
                        key
                    );


                    saveFiredReminders();


                    sendReminderNotification(
                        task,
                        today
                    );

                }

            }

        }
    );


    cleanupFiredReminders();
}


/* =========================================================
   CLEANUP REMINDERS
   ========================================================= */

function cleanupFiredReminders() {

    if (
        firedReminders.length <= 500
    ) {

        return;

    }


    firedReminders =
        firedReminders.slice(
            -250
        );


    saveFiredReminders();
}


/* =========================================================
   REQUEST NOTIFICATIONS
   ========================================================= */

let notificationPermissionRequested =
    false;


async function initializeNotifications() {

    if (
        notificationPermissionRequested
    ) {

        return;

    }


    notificationPermissionRequested =
        true;


    await requestNotificationPermission();


    checkReminders();
}


document.addEventListener(
    "click",
    () => {

        initializeNotifications();

    },
    {
        once: true
    }
);


checkReminders();


setInterval(
    checkReminders,
    30000
);


document.addEventListener(
    "visibilitychange",
    () => {

        if (
            !document.hidden
        ) {

            checkReminders();

        }

    }
);


/* =========================================================
   FOCUS TIMER
   ========================================================= */

let focusSeconds =
    25 * 60;


let focusInterval =
    null;


let currentFocusTask =
    null;


function updateFocusDisplay() {

    const minutes =
        Math.floor(
            focusSeconds / 60
        );


    const seconds =
        focusSeconds % 60;


    const element =
        document.getElementById(
            "focus-time"
        );


    if (!element) {

        return;

    }


    element.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}


function startFocusForTask(
    task
) {

    currentFocusTask =
        task;


    focusSeconds =
        (
            task.duration ||
            25
        ) * 60;


    updateFocusDisplay();


    showScreen(
        "focus"
    );
}


document.getElementById(
    "start-focus-button"
).addEventListener(
    "click",
    () => {

        if (focusInterval) {

            return;

        }


        focusInterval =
            setInterval(
                () => {

                    if (
                        focusSeconds <= 0
                    ) {

                        clearInterval(
                            focusInterval
                        );


                        focusInterval =
                            null;


                        stats.focus++;


                        stats.minutes +=
                            currentFocusTask
                                ?.duration ||
                            25;


                        saveStats();


                        playReminderSound();


                        renderStats();


                        return;

                    }


                    focusSeconds--;


                    updateFocusDisplay();

                },
                1000
            );

    }
);


document.getElementById(
    "reset-focus-button"
).addEventListener(
    "click",
    () => {

        clearInterval(
            focusInterval
        );


        focusInterval =
            null;


        focusSeconds =
            (
                currentFocusTask
                    ?.duration ||
                25
            ) * 60;


        updateFocusDisplay();

    }
);


document.getElementById(
    "home-focus-button"
).addEventListener(
    "click",
    () => {

        currentFocusTask =
            null;


        focusSeconds =
            25 * 60;


        updateFocusDisplay();


        showScreen(
            "focus"
        );

    }
);


/* =========================================================
   STATS
   ========================================================= */

function renderStats() {

    const completed =
        document.getElementById(
            "total-completed"
        );


    const focus =
        document.getElementById(
            "total-focus"
        );


    const minutes =
        document.getElementById(
            "total-minutes"
        );


    if (completed) {

        completed.textContent =
            stats.completed;

    }


    if (focus) {

        focus.textContent =
            stats.focus;

    }


    if (minutes) {

        minutes.textContent =
            stats.minutes;

    }
}


/* =========================================================
   INITIALIZE
   ========================================================= */

setupRepeatUI();

setupCategoryColorPicker();

renderCurrentDate();

renderHome();

renderCalendar();

renderStats();

updateFocusDisplay();

renderCategories();

checkReminders();


/*
   AQELIO READY

   Repeat:
   - Daily
   - Weekdays
   - Every week
   - Every other week
   - Every 3rd week
   - Every 4th week
   - Custom weekday selection

   Categories:
   - Custom color when creating
   - Subtle integrated delete button
   - Deleted categories safely reassigned

   Recurring tasks:
   - Correctly appear on Home
   - Correctly appear on Calendar
   - Completion tracked separately per occurrence

   Reminders:
   - At task time
   - 10 minutes before
   - 30 minutes before
   - 1 hour before
   - Browser notification
   - Sound
   - In-app fallback
   - Duplicate protection
*/
