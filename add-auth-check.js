const fs = require('fs');
const path = require('path');
const glob = require('glob');

const authCheck = `
  // Verificare autentificare și rol admin
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    } catch (e) {
      router.push('/login');
    }
  }, [router]);
`;

// Găsește toate fișierele page.tsx în admin
const files = glob.sync('frontend/src/app/(admin)/admin/**/page.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Verifică dacă nu are deja verificarea
  if (!content.includes('Verificare autentificare și rol admin')) {
    // Găsește primul useEffect sau unde să insereze
    const match = content.match(/export default function.*?\{([\s\S]*?)return/);
    if (match) {
      const beforeReturn = match[1];
      const insertPos = match.index + match[0].length - 'return'.length;
      
      // Inserează auth check înainte de return
      content = content.slice(0, insertPos) + authCheck + '\n  ' + content.slice(insertPos);
      
      fs.writeFileSync(file, content);
      console.log(`✅ Modified: ${file}`);
    }
  } else {
    console.log(`⏭️  Skipped (already has auth): ${file}`);
  }
});

console.log('\n✅ Done! Don\'t forget to rebuild.');
