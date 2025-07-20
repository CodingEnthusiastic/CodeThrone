import { Button, Modal } from "flowbite-react";

const Playground = () => {
    const { id: roomId } = useParams();
    const [socket, setSocket] = useState(null);
    const [opponent, setOpponent] = useState(null);
    const [time, setTime] = useState(60);
    const [isSubmitDisabled, setIsSubmitDisabled] = useState(true);
    const [showWinModal, setShowWinModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const newSocket = io("http://localhost:3001");
        setSocket(newSocket);

        newSocket.emit("join-room", roomId, (error) => {
            if (error) {
                console.error(error);
                navigate("/");
            }
        });

        newSocket.on("player-joined", (player) => {
            setOpponent(player);
            setIsSubmitDisabled(false);
        });

        newSocket.on("opponent-disconnected", () => {
            setShowWinModal(true);
            setOpponent(null);
            setIsSubmitDisabled(true);
        });

        return () => {
            newSocket.disconnect();
        };
    }, [roomId, navigate]);

    useEffect(() => {
        let timer;
        if (opponent && time > 0) {
            timer = setInterval(() => {
                setTime((prevTime) => prevTime - 1);
            }, 1000);
        } else if (time === 0) {
            setIsSubmitDisabled(true);
        }
        return () => clearInterval(timer);
    }, [opponent, time]);

    return (
        <div className="playground-container">
            <div className="playground-header">
                <div className="timer-container">
                    <div className="timer-box">{time}</div>
                    <div className="timer-label">seconds left</div>
                </div>
                <div className="player-info">
                    <img src="https://via.placeholder.com/40" alt="Opponent" />
                    <span>{opponent ? "Opponent" : "Connecting..."}</span>
                </div>
            </div>
            <div className="problem-statement">
                {/* Problem statement content */}
            </div>
            <div className="ide-container">
                <div className="ide-header">
                    {/* IDE header content */}
                </div>
                <textarea className="ide-body" placeholder="Write your code here..."></textarea>
                <div className="ide-footer">
                    <button className="console-button">Console</button>
                    <button className="submit-button" disabled={isSubmitDisabled}>Submit</button>
                </div>
            </div>
            <Modal show={showWinModal} onClose={() => navigate("/")}>
                <Modal.Header>Congratulations!</Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <p className="text-lg font-semibold">You Won!</p>
                        <p>Your opponent has disconnected from the game.</p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => navigate("/")}>Go to Homepage</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default Playground;