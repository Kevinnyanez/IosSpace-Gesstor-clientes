
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Iniciando limpieza automática del historial de pagos...')

    // Calcular fecha límite (30 días atrás)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 30)

    // Eliminar registros antiguos del historial
    const { data, error } = await supabaseClient
      .from('historial_pagos')
      .delete()
      .lt('created_at', fechaLimite.toISOString())

    if (error) {
      console.error('Error limpiando historial:', error)
      throw error
    }

    console.log('Limpieza automática completada exitosamente')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Historial limpiado automáticamente',
        fecha_limite: fechaLimite.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error en limpieza automática:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
