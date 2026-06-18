const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const MIME = {
	".html": "text/html; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
	".mp3": "audio/mpeg",
	".png": "image/png",
	".jpg": "image/jpeg",
	".woff2": "font/woff2",
	".ttf": "font/ttf",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
};

const root = __dirname;

http.createServer((req, res) => {
	const parsed = url.parse(req.url);
	const pathname = decodeURIComponent(parsed.pathname);
	const filePath = path.join(root, pathname === "/" ? "index.html" : pathname);

	fs.readFile(filePath, (err, data) => {
		if (err) {
			res.writeHead(404);
			res.end("Not found");
			return;
		}
		const ext = path.extname(filePath).toLowerCase();
		res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
		res.end(data);
	});
}).listen(8080, () => {
	console.log("Server at http://localhost:8080");
});
