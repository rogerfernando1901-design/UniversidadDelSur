import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Servidor local de la primera entrega. Requiere JDK 17 o superior. */
public class Main {
    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 8080;
        Path project = Path.of("").toRealPath();
        if (!Files.isRegularFile(project.resolve("Paginas/Pagina_principal.html"))) {
            throw new IllegalStateException("Ejecuta java Main.java desde la carpeta UniversidadDelSur.");
        }
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", exchange -> {
            try {
                String method = exchange.getRequestMethod();
                String route = exchange.getRequestURI().getPath();
                String file = route.equals("/") || route.equals("/index.html")
                    ? "Paginas/Pagina_principal.html" : route.substring(1);
                boolean allowed = (file.startsWith("Paginas/") && file.endsWith(".html"))
                    || (file.startsWith("CSS/") && file.endsWith(".css"))
                    || (file.startsWith("Java/") && file.endsWith(".js"));
                Path target = null;
                if (allowed && !file.contains("\\") && !file.contains(":")) {
                    Path candidate = project.resolve(file).normalize();
                    Path folder = project.resolve(file.substring(0, file.indexOf('/')));
                    if (candidate.startsWith(folder) && Files.isRegularFile(candidate)) {
                        Path real = candidate.toRealPath();
                        if (real.startsWith(folder)) target = real;
                    }
                }
                int status = 200;
                byte[] body;
                String type = "text/plain; charset=utf-8";
                if (!method.equals("GET") && !method.equals("HEAD")) {
                    status = 405;
                    exchange.getResponseHeaders().set("Allow", "GET, HEAD");
                    body = "Método no permitido".getBytes(StandardCharsets.UTF_8);
                } else if (target == null) {
                    status = 404;
                    type = "text/html; charset=utf-8";
                    body = ("<!doctype html><html lang=\"es\"><meta charset=\"utf-8\">"
                        + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
                        + "<title>Página no disponible</title><h1>Página no disponible</h1>"
                        + "<p>Esta página todavía no está disponible o la dirección no existe.</p>"
                        + "<a href=\"/\">Volver al inicio</a></html>").getBytes(StandardCharsets.UTF_8);
                } else {
                    body = Files.readAllBytes(target);
                    type = file.endsWith(".css") ? "text/css; charset=utf-8"
                         : file.endsWith(".js") ? "text/javascript; charset=utf-8"
                         : "text/html; charset=utf-8";
                }
                exchange.getResponseHeaders().set("Content-Type", type);
                exchange.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
                exchange.getResponseHeaders().set("Cache-Control", "no-store");
                exchange.getResponseHeaders().set("Content-Security-Policy",
                    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
                exchange.sendResponseHeaders(status, method.equals("HEAD") ? -1 : body.length);
                if (!method.equals("HEAD")) exchange.getResponseBody().write(body);
            } finally {
                exchange.close();
            }
        });
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
        server.start();
        System.out.println("Portal UHS: http://localhost:" + port);
        System.out.println("Para detener el servidor: Ctrl+C");
    }
}
