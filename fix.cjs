const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/\s*useEffect\(\(\) => \{\s*async function testSupabase[\s\S]*?testSupabase\(\);\s*\},\s*\[\]\);/g, '');

const oldState = `const [products, setProducts] = useLocalState("mcf_products", initialProducts);
  const [providers, setProviders] = useLocalState("mcf_providers", initialProviders);
  const [sales, setSales] = useLocalState("mcf_sales", []);`;

const newState = `const [products, setProducts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [sales, setSales] = useState([]);
  useEffect(() => {
    supabase.from("products").select("*").order("name").then(({ data }) => { if (data) setProducts(data); });
    supabase.from("providers").select("*").order("name").then(({ data }) => { if (data) setProviders(data); });
    supabase.from("sales").select("*").order("created_at", { ascending: false }).then(({ data }) => { if (data) setSales(data); });
  }, []);`;

code = code.replace(oldState, newState);
fs.writeFileSync('src/App.jsx', code, 'utf8');
console.log('Listo');
