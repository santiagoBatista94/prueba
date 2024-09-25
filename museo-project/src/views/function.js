document.addEventListener("DOMContentLoaded", async function () {
    const departmentSelect = document.getElementById("department");
    const geoLocationInput = document.getElementById("geoLocation");
    const keywordInput = document.getElementById("keyword");
    const hasImagesCheckbox = document.getElementById("hasImages");
    const searchForm = document.getElementById("searchForm");
    const resultsContainer = document.getElementById("results");
    const paginationContainer = document.createElement("div"); // Contenedor de paginación
    let currentPage = 1; // Página actual
    const resultsPerPage = 20; // Número de resultados por página
    let allObjectIDs = []; // Almacenar todos los objectIDs

    paginationContainer.classList.add("pagination");
    document.body.appendChild(paginationContainer); // Añadir paginación al DOM

    // Cargar departamentos desde la API
    try {
        const response = await fetch(
            "https://collectionapi.metmuseum.org/public/collection/v1/departments"
        );
        const data = await response.json();

        data.departments.forEach((department) => {
            const option = document.createElement("option");
            option.value = department.departmentId;
            option.textContent = department.displayName;
            departmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Error al cargar departamentos:", error);
    }

    searchForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const departmentId = departmentSelect.value;
        const keyword = keywordInput.value.trim();
        const geoLocation = geoLocationInput.value;
        const hasImages = hasImagesCheckbox.checked;

        // Construir la URL de búsqueda
        let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?`;

        if (departmentId) url += `&departmentId=${departmentId}`;
        if (keyword) url += `&q=${keyword}`;
        if (hasImages) url += `&hasImages=true`;
        if (geoLocation) url += `&geoLocation=${geoLocation}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.status}`);
            }

            const data = await response.json();
            allObjectIDs = data.objectIDs || [];
            currentPage = 1; // Reiniciar a la primera página
            displayResults(allObjectIDs);
        } catch (error) {
            console.error("Error al buscar resultados:", error);
            resultsContainer.innerHTML = "<p>Error al buscar resultados.</p>";
        }
    });

    // Mostrar resultados con paginación
    function displayResults(objectIDs) {
        resultsContainer.innerHTML = ""; // Limpiar resultados anteriores

        if (!objectIDs || objectIDs.length === 0) {
            resultsContainer.innerHTML = "<p>No se encontraron resultados.</p>";
            return;
        }

        // Calcular el rango de resultados que mostrar
        const startIndex = (currentPage - 1) * resultsPerPage;
        const endIndex = Math.min(startIndex + resultsPerPage, objectIDs.length);
        const objectIDsToShow = objectIDs.slice(startIndex, endIndex);

        // Obtener detalles de los objetos
        const objectPromises = objectIDsToShow.map((id) =>
            fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`).then((res) =>
                res.json()
            )
        );

        Promise.all(objectPromises)
            .then((objects) => {
                objects.forEach((object) => {
                    if (object && object.objectID) {
                        const card = createCard(object);
                        if (card) {
                            resultsContainer.appendChild(card);
                        } else {
                            console.error("Error al crear la tarjeta para el objeto:", object);
                        }
                    } else {
                        console.error("Objeto no válido:", object);
                    }
                });
                updatePagination(objectIDs.length);
            })
            .catch((error) => {
                console.error("Error al obtener los detalles de los objetos:", error);
                resultsContainer.innerHTML =
                    "<p>Error al cargar los detalles de los objetos.</p>";
            });
    }

    // Actualizar botones de paginación
    function updatePagination(totalResults) {
        paginationContainer.innerHTML = ""; // Limpiar paginación anterior

        const totalPages = Math.ceil(totalResults / resultsPerPage);

        // Crear botón "Anterior"
        if (currentPage > 1) {
            const prevButton = document.createElement("button");
            prevButton.textContent = "Anterior";
            prevButton.addEventListener("click", () => {
                currentPage--;
                displayResults(allObjectIDs);
            });
            paginationContainer.appendChild(prevButton);
        }

        // Crear botón "Siguiente"
        if (currentPage < totalPages) {
            const nextButton = document.createElement("button");
            nextButton.textContent = "Siguiente";
            nextButton.addEventListener("click", () => {
                currentPage++;
                displayResults(allObjectIDs);
            });
            paginationContainer.appendChild(nextButton);
        }
    }

    function createCard(object) {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = object.primaryImage || "/image/sinImagen.jpg";
        img.alt = object.title || "Sin título";
        img.title = object.objectDate || "Desconocida";

        const title = document.createElement("h2");
        title.textContent = getOrDefault(object.title, "Sin título");

        const culture = document.createElement("p");
        culture.textContent = `Cultura: ${getOrDefault(object.culture, "Desconocida")}`;

        const dynasty = document.createElement("p");
        dynasty.textContent = `Dinastía: ${getOrDefault(object.dynasty, "Desconocida")}`;

        const additionalImagesLink = document.createElement("a");
        additionalImagesLink.href = `/object/${object.objectID}`;
        additionalImagesLink.textContent = "Ver imágenes adicionales";

        card.appendChild(img);
        card.appendChild(title);
        card.appendChild(culture);
        card.appendChild(dynasty);
        card.appendChild(additionalImagesLink);

        return card;
    }

    // Función auxiliar para manejar valores predeterminados
    function getOrDefault(value, defaultValue) {
        return value || defaultValue;
    }
});
