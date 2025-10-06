const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDealsRegisteredBy() {
  try {
    console.log('🔧 Atualizando campo registered_by dos deals existentes...\n');

    // Buscar todos os tenants
    const tenants = await prisma.tenant.findMany({
      select: { id: true, schemaName: true, name: true }
    });

    console.log(`📊 Encontrados ${tenants.length} tenants\n`);

    for (const tenant of tenants) {
      console.log(`\n🏢 Processando tenant: ${tenant.name} (${tenant.schemaName})`);

      try {
        // Adicionar coluna registered_by se não existir
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "${tenant.schemaName}".deals
          ADD COLUMN IF NOT EXISTS registered_by VARCHAR
        `);

        // Buscar todos os deals sem registered_by
        const deals = await prisma.$queryRawUnsafe(`
          SELECT id, created_by
          FROM "${tenant.schemaName}".deals
          WHERE registered_by IS NULL AND is_active = TRUE
        `);

        console.log(`  📋 Encontrados ${deals.length} deals para atualizar`);

        for (const deal of deals) {
          try {
            // Buscar o usuário que criou o deal
            const user = await prisma.user.findUnique({
              where: { id: deal.created_by },
              select: { name: true, email: true }
            });

            if (user) {
              const userName = user.name || user.email.split('@')[0];
              
              // Atualizar o deal com o nome do usuário
              await prisma.$executeRawUnsafe(`
                UPDATE "${tenant.schemaName}".deals
                SET registered_by = $1
                WHERE id = $2
              `, userName, deal.id);

              console.log(`    ✅ Deal ${deal.id} atualizado com: ${userName}`);
            } else {
              console.log(`    ⚠️  Usuário não encontrado para deal ${deal.id}`);
            }
          } catch (error) {
            console.error(`    ❌ Erro ao atualizar deal ${deal.id}:`, error.message);
          }
        }

      } catch (error) {
        console.error(`  ❌ Erro ao processar ${tenant.schemaName}:`, error.message);
      }
    }

    console.log('\n✅ Atualização concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDealsRegisteredBy();