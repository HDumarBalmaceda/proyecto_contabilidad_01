/**
 * Lógica de búsqueda avanzada para las tarjetas de colegios
 */
document.addEventListener("DOMContentLoaded", function() {
    const searchInput = document.querySelector('.search-input');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            // Convertimos la búsqueda en palabras sueltas, quitando espacios vacíos
            const terminosBusqueda = e.target.value.toLowerCase().split(' ').filter(term => term !== '');
            const tarjetas = document.querySelectorAll('.col-card'); // Usaremos una clase específica para las columnas

            tarjetas.forEach(col => {
                // Extraemos la info de los data-attributes y del texto visible
                const nombre = col.querySelector('.card-title')?.textContent.toLowerCase() || "";
                const municipio = col.querySelector('.municipio-text')?.textContent.toLowerCase() || "";
                const nit = col.getAttribute('data-nit')?.toLowerCase() || "";
                const rector = col.getAttribute('data-rector')?.toLowerCase() || "";

                // Unimos todo para buscar en un solo string
                const contenidoTotal = `${nombre} ${municipio} ${nit} ${rector}`;

                // Verificamos que todas las palabras buscadas estén en el contenido
                const coincide = terminosBusqueda.every(termino => contenidoTotal.includes(termino));

                // Mostrar u ocultar con una pequeña transición si usas clases de Bootstrap
                if (coincide || terminosBusqueda.length === 0) {
                    col.classList.remove('d-none');
                } else {
                    col.classList.add('d-none');
                }
            });
        });
    }
});