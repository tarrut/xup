import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { partiesApi } from '../api/parties'

export default function JoinPage() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    partiesApi.join(code!).then(() => {
      navigate(`/lobby/${code}`, { replace: true })
    }).catch(() => {
      navigate('/', { replace: true })
    })
  }, [code, navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500">{t('loading')}</div>
    </div>
  )
}
