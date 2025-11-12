import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { 'machine-id': string } }
) {
  try {
    const machineId = params['machine-id']
    
    const machine = await prisma.machine.findUnique({
      where: {
        id: machineId
      }
    })

    if (!machine) {
      return NextResponse.json({ error: 'Machine not found' }, { status: 404 })
    }

    return NextResponse.json(machine)
  } catch (error) {
    console.error('Error fetching machine:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}