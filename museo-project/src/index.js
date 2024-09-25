import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import translate from "node-google-translate-skidz";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "views")));

// Función para traducir texto con Google Translate
const translateText = async (text) => {
    try {
        const translation = await translate({
            text: text,
            source: 'en',
            target: 'es'
        });
        return translation.translation;
    } catch (error) {
        console.error("Error al traducir:", error.message);
        return text;  // Si falla la traducción, devolver el texto original
    }
};

// Ruta de inicio
app.get("/", (req, res) => {
    res.render("index");
});

// Ruta de búsqueda sin paginación
app.get("/search", async (req, res) => {
    const departmentId = req.query.departmentId || "";
    const keyword = req.query.keyword || "";
    const hasImages = req.query.hasImages || "";
    const geoLocation = req.query.geoLocation || "";
    
    let url = `https://collectionapi.metmuseum.org/public/collection/v1/search?`;

    if (departmentId) url += `&departmentId=${departmentId}`;
    if (keyword) url += `&q=${keyword}`;
    if (hasImages) url += `&hasImages=true`;
    if (geoLocation) url += `&geoLocation=${geoLocation}`;

    try {
        const response = await axios.get(url);

        if (!response.data || !Array.isArray(response.data.objectIDs) || response.data.objectIDs.length === 0) {
            return res.json({ objects: [], message: "No hay resultados" });
        }

        let objectIDs = response.data.objectIDs;
        const objects = await Promise.all(
            objectIDs.map(async (id) => {
                try {
                    const objResponse = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
                    const object = objResponse.data;

                    // Solo mostrar objetos que tengan imágenes
                    if (!object.primaryImage) {
                        return null;
                    }

                    // Traducir título, cultura y dinastía
                    object.title = await translateText(object.title || 'Sin título');
                    object.culture = await translateText(object.culture || 'Desconocida');
                    object.dynasty = await translateText(object.dynasty || 'Desconocida');
                    return object;
                } catch (error) {
                    console.error(`Error al obtener el objeto con ID ${id}:`, error.message);
                    return null;
                }
            })
        );

        // Filtrar los objetos válidos (los que no sean null)
        const validObjects = objects.filter(obj => obj !== null);

        res.render('results', {
            objects: validObjects,
            departmentId: departmentId,
            keyword: keyword,
            geoLocation: geoLocation
        });

    } catch (error) {
        console.error("Error en la consulta a la API:", error.message);
        res.status(500).send("Error al recuperar los resultados.");
    }
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
