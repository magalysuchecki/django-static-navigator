import { describe, test, before, after } from 'node:test';
import * as assert from 'node:assert/strict';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';
import {
	buildCandidates,
	cleanRelativePath,
	findPythonReference,
	findTemplateReference,
	resolveStaticFile,
} from '../staticResolver';

describe('findTemplateReference', () => {
	test('detecta comillas dobles y simples', () => {
		assert.equal(findTemplateReference('{% static "css/a.css" %}', 12)?.relativePath, 'css/a.css');
		assert.equal(findTemplateReference("{% static 'js/b.js' %}", 12)?.relativePath, 'js/b.js');
	});

	test('acepta etiquetas sin espacios y con "as variable"', () => {
		assert.equal(findTemplateReference("{%static 'x.css'%}", 10)?.relativePath, 'x.css');
		assert.equal(findTemplateReference("{% static 'img/l.png' as logo %}", 12)?.relativePath, 'img/l.png');
	});

	test('devuelve la posición de la ruta sin comillas', () => {
		const line = '<link href="{% static \'css/a.css\' %}">';
		const ref = findTemplateReference(line, 25);
		assert.ok(ref);
		assert.equal(line.slice(ref.start, ref.end), 'css/a.css');
	});

	test('elige la etiqueta bajo el cursor cuando hay varias', () => {
		const line = "{% static 'a.css' %} {% static 'b.js' %}";
		assert.equal(findTemplateReference(line, 2)?.relativePath, 'a.css');
		assert.equal(findTemplateReference(line, 30)?.relativePath, 'b.js');
	});

	test('devuelve null fuera de la etiqueta o sin etiqueta', () => {
		assert.equal(findTemplateReference('<p>hola</p> {% static "a.css" %}', 2), null);
		assert.equal(findTemplateReference('{% url "home" %}', 5), null);
	});

	test('limpia query string y barra inicial', () => {
		assert.equal(findTemplateReference("{% static '/js/app.js?v=3' %}", 12)?.relativePath, 'js/app.js');
	});
});

describe('findPythonReference', () => {
	test('detecta strings con extensiones configuradas', () => {
		assert.equal(findPythonReference("js = 'app/main.js'", 8, ['js', 'css'])?.relativePath, 'app/main.js');
		assert.equal(findPythonReference('css = "x.css"', 8, ['.css'])?.relativePath, 'x.css');
	});

	test('ignora extensiones no configuradas o lista vacía', () => {
		assert.equal(findPythonReference("f = 'a.png'", 6, ['js']), null);
		assert.equal(findPythonReference("f = 'a.js'", 6, []), null);
	});

	test('escapa caracteres especiales de la extensión', () => {
		assert.equal(findPythonReference("f = 'a.min+js'", 6, ['min+js'])?.relativePath, 'a.min+js');
	});
});

describe('cleanRelativePath y buildCandidates', () => {
	test('normaliza barras invertidas', () => {
		assert.equal(cleanRelativePath('\\css\\a.css#x'), 'css/a.css');
	});

	test('combina raíces y carpetas aceptando "\\" en la configuración', () => {
		const root = path.resolve('/proyecto');
		const result = buildCandidates('css/a.css', [root], ['public\\static', 'static']);
		assert.deepEqual(result, [
			path.join(root, 'public', 'static', 'css', 'a.css'),
			path.join(root, 'static', 'css', 'a.css'),
		]);
	});

	test('descarta rutas que escapan de la carpeta de estáticos', () => {
		assert.deepEqual(buildCandidates('../../secreto.txt', [path.resolve('/p')], ['static']), []);
	});
});

describe('resolveStaticFile', () => {
	let root: string;

	before(async () => {
		root = await fs.mkdtemp(path.join(os.tmpdir(), 'dsn-'));
		await fs.mkdir(path.join(root, 'public', 'static', 'css'), { recursive: true });
		await fs.mkdir(path.join(root, 'blog', 'static', 'js'), { recursive: true });
		await fs.writeFile(path.join(root, 'public', 'static', 'css', 'a.css'), '');
		await fs.writeFile(path.join(root, 'blog', 'static', 'js', 'b.js'), '');
	});

	after(async () => {
		await fs.rm(root, { recursive: true, force: true });
	});

	test('encuentra el archivo en una carpeta configurada con "\\"', async () => {
		const found = await resolveStaticFile('css/a.css', { roots: [root], dirs: ['static', 'public\\static'] });
		assert.equal(found, path.join(root, 'public', 'static', 'css', 'a.css'));
	});

	test('devuelve null si el archivo no existe', async () => {
		assert.equal(await resolveStaticFile('css/no.css', { roots: [root], dirs: ['public/static'] }), null);
	});

	test('usa la búsqueda de respaldo para estáticos de apps', async () => {
		const appFile = path.join(root, 'blog', 'static', 'js', 'b.js');
		const found = await resolveStaticFile('js/b.js', {
			roots: [root],
			dirs: ['public/static'],
			search: async () => [path.join(root, 'fantasma.js'), appFile],
		});
		assert.equal(found, appFile);
	});

	test('devuelve null si la búsqueda de respaldo falla', async () => {
		const found = await resolveStaticFile('js/x.js', {
			roots: [root],
			dirs: [],
			search: async () => { throw new Error('falló'); },
		});
		assert.equal(found, null);
	});
});
