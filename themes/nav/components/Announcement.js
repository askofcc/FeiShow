import dynamic from "next/dynamic"

const NotionPage = dynamic(() => import("@/components/NotionPage"))

const Announcement = ({ notice, className }) => {
  if (notice?.blockMap || notice?.feishuContent) {
    return (
      <div className={className}>
        <section id="announcement-wrapper" className="dark:text-gray-300 mb-4">
          <div id="announcement-content">
            <NotionPage post={notice} />
          </div>
        </section>
      </div>
    )
  }
  return null
}
export default Announcement
