/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

import java.awt.Font;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.event.MouseEvent;
import java.awt.event.MouseListener;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.ObjectInputStream;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.swing.JFrame;

/**
 * TODOS: Partikel Licht Anzeige für zwergaktionen Abbaubilder Balance
 * 
 */
public class ZwergenLoch extends JFrame implements MouseListener
{
    Image          hintergrnd, button, button2, impress, story, icon;
    Image[]        tut        = new Image[7];
    String[]       welten;
    boolean        shoimp     = false;
    static boolean play       = false;
    static boolean joke       = false;
    boolean        s          = false;
    int            tuto       = -1;
    int            umschalten = 500;
    Fenster        f;
    Welt           w;

    public ZwergenLoch()
    {
        setDefaultCloseOperation(3);
        setBounds(0, 0, 640, 400);
        setResizable(false);
        hintergrnd = Welt.bildLaden("hintergrund.png");
        impress = Welt.bildLaden("dasteam.png");
        button = Welt.bildLaden("button.png");
        button2 = Welt.bildLaden("button2.png");
        story = Welt.bildLaden("story.png");
        icon = Welt.bildLaden("icon.png");
        tut[0] = Welt.bildLaden("tutorial_basics.png");
        tut[1] = Welt.bildLaden("tutorial_blocks.png");
        tut[2] = Welt.bildLaden("tutorial_control.png");
        tut[3] = Welt.bildLaden("tutorial_pickaxedwarf.png");
        tut[4] = Welt.bildLaden("tutorial_warhammerdwarf.png");
        tut[5] = Welt.bildLaden("tutorial_axedwarf.png");
        tut[6] = Welt.bildLaden("tutorial_monsters.png");
        setIconImage(icon);
        File f = new File("worlds/");
        welten = f.list();
        setVisible(true);
        addMouseListener(this);
    }

    @Override
    public void paint(Graphics g)
    {
        super.paint(g);
        if (shoimp)
        {
            g.drawImage(impress, 0, 0, null);
        }
        else if (play)
        {
            g.drawImage(hintergrnd, 0, 0, null);
            Font f = new Font("Arial", Font.BOLD, 22);
            g.setFont(f);
            g.drawImage(button, 100, 60, null);
            g.drawString("Back", 110, 87);
            g.drawImage(button2, 550, 180, null);
            g.drawString(">", 560, 207);
            g.drawImage(button2, 50, 180, null);
            g.drawString("<", 60, 207);
            for (int i = 0; i < 4; i++)
            {
                g.drawImage(button, 100, 120 + 60 * i, null);
                int x = (i + umschalten) % (welten.length);
                g.drawString(welten[x].substring(0, welten[x].length() - 5), 110, 147 + 60 * i);
            }
        }
        else if (tuto != -1)
        {
            g.drawImage(tut[tuto], 0, 0, getWidth(), getHeight(), null);
        }
        else if (s)
        {
            g.drawImage(story, 0, 0, getWidth(), getHeight(), null);
        }
        else
        {
            Font f = new Font("Arial", Font.BOLD, 22);
            g.setFont(f);
            g.drawImage(hintergrnd, 0, 0, null);
            g.drawImage(button, 100, 60, null);
            g.drawString("Play", 110, 87);
            g.drawImage(button, 100, 120, null);
            if (Fenster.soundmachen == true)
            {
                g.drawString("Mute ", 110, 147);
            }
            else
            {
                g.drawString("Demute", 110, 147);
            }
            g.drawImage(button, 100, 180, null);
            g.drawString("Impressum", 110, 207);
            g.drawImage(button, 100, 240, null);
            g.drawString("Tutorial", 110, 267);
        }
    }

    /**
     * @param args
     *            the command line arguments
     */
    public static void main(String[] args)
    {
        System.out.println("start");
        reset();
    }

    public static void reset()
    {
        Menue m = new Menue();
        m.start();
        System.out.println(m);
        while (m.z == null || m.z.w == null)
        {
            try
            {
                Thread.sleep(2);
            }
            catch (InterruptedException ex)
            {
                Logger.getLogger(ZwergenLoch.class.getName()).log(Level.SEVERE, null, ex);
            }
        }
        if (m.z.w != null)
        {
            System.out.println(m.z.w);
            Fenster f = new Fenster(m.z.w);
        }
    }

    static class Menue extends Thread
    {
        ZwergenLoch z;

        @Override
        public void run()
        {
            z = new ZwergenLoch();
        }

        public void neustart()
        {
            Menue test = new Menue();
            test.start();
        }
    }

    @Override
    public void mouseClicked(MouseEvent e)
    {
    }

    @Override
    public void mousePressed(MouseEvent e)
    {
        if (shoimp)
        {
            shoimp = false;
            repaint();
            Fenster.soundLaden("abbau.wav");
        }
        if (s)
        {
            s = false;
            play = true;
            repaint();
            Fenster.soundLaden("abbau.wav");
        }
        else if (play)
        {
            if (e.getY() > 60 && e.getY() < 101)
            {
                play = false;
                repaint();
                Fenster.soundLaden("abbau.wav");
            }
            else if (e.getX() > 50 && e.getX() < 90 && e.getY() > 180 && e.getY() < 220)
            {
                Fenster.soundLaden("abbau.wav");
                umschalten--;
                repaint();
            }
            else if (e.getX() > 550 && e.getX() < 590 && e.getY() > 180 && e.getY() < 220)
            {
                Fenster.soundLaden("abbau.wav");
                umschalten++;
                repaint();
            }
            else if (e.getY() > 120)
            {
                int ypos = e.getY();
                ypos -= 120;
                int nr = (int) (ypos / 60);
                if (welten.length > nr && ypos % 60 < 41)
                {
                    int x = (nr + umschalten) % (welten.length);
                    Fenster.soundLaden("abbau.wav");
                    setVisible(false);
                    FileInputStream fin = null;
                    try
                    {
                        fin = new FileInputStream("worlds/" + welten[x]);
                    }
                    catch (IOException ex)
                    {
                        Logger.getLogger(ZwergenLoch.class.getName()).log(Level.SEVERE, null, ex);
                    }
                    if (fin != null)
                    {
                        ObjectInputStream oin;
                        try
                        {
                            oin = new ObjectInputStream(fin);
                            w = (Welt) (oin.readObject());
                            oin.close();
                            fin.close();
                        }
                        catch (ClassNotFoundException ex)
                        {
                            Logger.getLogger(ZwergenLoch.class.getName()).log(Level.SEVERE, null, ex);
                        }
                        catch (IOException ex)
                        {
                            Logger.getLogger(ZwergenLoch.class.getName()).log(Level.SEVERE, null, ex);
                        }
                    }
                }
            }
        }
        else if (tuto != -1)
        {
            tuto++;
            if (tuto > 6)
            {
                tuto = -1;
            }
            repaint();
            Fenster.soundLaden("abbau.wav");
        }
        else if (e.getX() > 100 && e.getX() < 500)
        {
            if (e.getY() > 60 && e.getY() < 101)
            {
                s = true;
                repaint();
                Fenster.soundLaden("abbau.wav");
            }
            else if (e.getY() > 120 && e.getY() < 161)
            {
                Fenster.soundmachen = !Fenster.soundmachen;
                repaint();
                Fenster.soundLaden("abbau.wav");
            }
            else if (e.getY() > 180 && e.getY() < 221)
            {
                shoimp = true;
                repaint();
                Fenster.soundLaden("abbau.wav");
            }
            else if (e.getY() > 240 && e.getY() < 281)
            {
                tuto++;
                repaint();
                Fenster.soundLaden("abbau.wav");
            }
        }
    }

    @Override
    public void mouseReleased(MouseEvent e)
    {
    }

    @Override
    public void mouseEntered(MouseEvent e)
    {
    }

    @Override
    public void mouseExited(MouseEvent e)
    {
    }
}
