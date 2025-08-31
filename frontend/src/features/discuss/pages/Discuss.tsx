import PageTitle from "../../../layouts/PageTitle";
import { ReactNode, useEffect, useState } from "react";
import Question, { IQuestion } from "../components/Question";
import { useApi } from "../../../context/apiCommunication";
 
interface DiscussProps {
    MainPage: ReactNode
}

const Discuss = ({ MainPage }: DiscussProps) => {
    PageTitle("Webler - Discuss", false);

    const { sendJsonRequest } = useApi();
    const [questions, setQuestions] = useState<IQuestion[]>([]);

    useEffect(() => {
        getQuestions();
    }, []);

    const getQuestions = async () => {
        const result = await sendJsonRequest(`/Discussion`, "POST", {
            page: 1,
            count: 10,
            searchQuery: "",
            filter: 5,
            userId: null
        });
        if (result && result.questions) {
            setQuestions(result.questions);
        }
    }
    
      return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
          {MainPage}

          {/* Hot Today Section */}
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl space-y-3">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
              🔥 Hot Today
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
               {
                  questions.map(question => {
                      return (
                        <Question key={question.id} question={question} searchQuery="" showUserProfile={false} />
                      );
                  })
                }
            </div>
          </div>
        </div>
      );
}

export default Discuss;