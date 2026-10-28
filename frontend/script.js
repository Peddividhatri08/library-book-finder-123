// LIBRARY BOOK FINDER
// Connected to Node.js + Express + Supabase backend

const API_URL = "http://localhost:3000/api";

let books = [];

// Get HTML elements
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const bookList = document.getElementById("bookList");
const bookCount = document.getElementById("bookCount");
const noBooksMessage = document.getElementById("noBooksMessage");

const bookForm = document.getElementById("bookForm");
const bookId = document.getElementById("bookId");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const isbnInput = document.getElementById("isbn");
const totalCopiesInput = document.getElementById("totalCopies");
const availableCopiesInput = document.getElementById("availableCopies");

const saveBookButton = document.getElementById("saveBookButton");
const cancelEditButton = document.getElementById("cancelEdit");
const formMessage = document.getElementById("formMessage");
const detailsContent = document.getElementById("detailsContent");

// Convert database field names to frontend field names
function formatBook(book) {
    return {
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        isbn: book.isbn,
        totalCopies: book.total_copies,
        availableCopies: book.available_copies
    };
}

// Display messages
function showMessage(message, type = "success") {
    formMessage.textContent = message;
    formMessage.style.color =
        type === "error" ? "#b91c1c" : "#15803d";
}

// Make API requests
async function apiRequest(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(result.error || "Something went wrong.");
    }

    return result;
}

// Load books from the database
async function loadBooks(search = "") {
    try {
        bookList.textContent = "Loading books...";

        const query = search
            ? `?search=${encodeURIComponent(search)}`
            : "";

        const result = await apiRequest(`/books${query}`);

        books = result.map(formatBook);

        displayBooks(books);
    } catch (error) {
        bookList.replaceChildren();
        bookCount.textContent = "Unable to load books";
        noBooksMessage.hidden = true;

        showMessage(
            "Could not connect to the backend. Make sure the server is running.",
            "error"
        );

        console.error("Loading books failed:", error);
    }
}

// Display books on the page
function displayBooks(bookArray = books) {
    bookList.replaceChildren();

    bookCount.textContent = `Showing ${bookArray.length} book(s)`;
    noBooksMessage.hidden = bookArray.length !== 0;

    bookArray.forEach(book => {
        const card = document.createElement("article");
        card.className = "book-card";

        const heading = document.createElement("h3");
        heading.textContent = book.title;

        const author = document.createElement("p");
        author.textContent = `Author: ${book.author}`;

        const category = document.createElement("p");
        category.textContent = `Category: ${book.category}`;

        const copies = document.createElement("p");
        copies.textContent =
            `Available copies: ${book.availableCopies} / ${book.totalCopies}`;

        const availability = document.createElement("span");
        availability.className =
            `availability ${
                book.availableCopies > 0 ? "available" : "unavailable"
            }`;

        availability.textContent =
            book.availableCopies > 0 ? "Available" : "Unavailable";

        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.textContent = "View Details";
        detailsButton.addEventListener("click", () => {
            viewBookDetails(book.id);
        });

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
            editBook(book.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => {
            deleteBook(book.id);
        });

        card.append(
            heading,
            author,
            category,
            copies,
            availability,
            document.createElement("br"),
            detailsButton,
            editButton,
            deleteButton
        );

        bookList.appendChild(card);
    });
}

// Search books through the backend
searchForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    await loadBooks(searchInput.value.trim());
});

// Clear search
clearSearch.addEventListener("click", async function () {
    searchInput.value = "";
    await loadBooks();
});

// View book details from the backend
async function viewBookDetails(id) {
    try {
        const result = await apiRequest(`/books/${id}`);
        const book = formatBook(result);

        detailsContent.replaceChildren();

        const fields = [
            ["Title", book.title],
            ["Author", book.author],
            ["Category", book.category],
            ["ISBN", book.isbn],
            ["Total Copies", book.totalCopies],
            ["Available Copies", book.availableCopies],
            [
                "Availability",
                book.availableCopies > 0 ? "Available" : "Unavailable"
            ]
        ];

        fields.forEach(([label, value]) => {
            const paragraph = document.createElement("p");
            const strong = document.createElement("strong");

            strong.textContent = `${label}: `;
            paragraph.append(
                strong,
                document.createTextNode(String(value))
            );

            detailsContent.appendChild(paragraph);
        });

        document.getElementById("bookDetails").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Reset the form
function resetBookForm() {
    bookForm.reset();
    bookId.value = "";
    totalCopiesInput.value = 1;
    availableCopiesInput.value = 1;
    saveBookButton.textContent = "Add Book";
    cancelEditButton.hidden = true;
}

// Add or update a book in Supabase
bookForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const title = titleInput.value.trim();
    const author = authorInput.value.trim();
    const category = categoryInput.value;
    const isbn = isbnInput.value.trim();

    const totalCopies = Number(totalCopiesInput.value);
    const availableCopies = Number(availableCopiesInput.value);

    if (!title || !author || !category || !isbn) {
        showMessage("Please fill in all required fields.", "error");
        return;
    }

    if (
        !Number.isInteger(totalCopies) ||
        !Number.isInteger(availableCopies) ||
        totalCopies < 0 ||
        availableCopies < 0
    ) {
        showMessage(
            "Copy counts must be non-negative whole numbers.",
            "error"
        );
        return;
    }

    if (availableCopies > totalCopies) {
        showMessage(
            "Available copies cannot exceed total copies.",
            "error"
        );
        return;
    }

    // Supabase database column names use underscores
    const bookData = {
        title,
        author,
        category,
        isbn,
        total_copies: totalCopies,
        available_copies: availableCopies
    };

    try {
        saveBookButton.disabled = true;

        if (bookId.value) {
            await apiRequest(`/books/${bookId.value}`, {
                method: "PUT",
                body: JSON.stringify(bookData)
            });

            showMessage("Book updated successfully.");
        } else {
            await apiRequest("/books", {
                method: "POST",
                body: JSON.stringify(bookData)
            });

            showMessage("Book added successfully.");
        }

        resetBookForm();
        await loadBooks();
    } catch (error) {
        showMessage(error.message, "error");
    } finally {
        saveBookButton.disabled = false;
    }
});

// Load book details into the edit form
async function editBook(id) {
    try {
        const result = await apiRequest(`/books/${id}`);
        const book = formatBook(result);

        bookId.value = book.id;
        titleInput.value = book.title;
        authorInput.value = book.author;
        categoryInput.value = book.category;
        isbnInput.value = book.isbn;
        totalCopiesInput.value = book.totalCopies;
        availableCopiesInput.value = book.availableCopies;

        saveBookButton.textContent = "Update Book";
        cancelEditButton.hidden = false;

        showMessage("Edit the details and click Update Book.");

        document.getElementById("manage").scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Cancel editing
cancelEditButton.addEventListener("click", function () {
    resetBookForm();
    showMessage("Editing cancelled.");
});

// Delete a book from the database
async function deleteBook(id) {
    const book = books.find(item => String(item.id) === String(id));

    if (!book) {
        showMessage("Book not found.", "error");
        return;
    }

    const confirmed = window.confirm(
        `Are you sure you want to delete "${book.title}"?`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`/books/${id}`, {
            method: "DELETE"
        });

        detailsContent.textContent =
            "Select a book to view its details.";

        showMessage("Book deleted successfully.");
        await loadBooks(searchInput.value.trim());
    } catch (error) {
        showMessage(error.message, "error");
    }
}

// Load database records when the page opens
loadBooks();